import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';

export interface CompanySearchResult {
  id: number;
  value: string;
  inn: string;
  ogrn: string;
}

export interface CompanyCardData {
  ДатаОГРН?: string;
  НалогРежим?: string;
  НаимОКВЭД?: string;
  НалогПравонаруш?: string;
  НедобросовПостав?: string;
  КПП?: string;
  ЮрАдрес?: string;
}

export interface BankruptData {
  MessageInfo?: {
    Meeting?: string;
  };
}

export interface ImportantFact {
  name: string;
  desc: string;
  value: string;
}

export interface ImportantFactsData {
  success: ImportantFact[];
  warning: ImportantFact[];
  danger: ImportantFact[];
}

export interface CourtCase {
  Истец: Array<{ Наименование: string; ИНН: string; ОГРН: string }>;
  Ответчик: Array<{ Наименование: string; ИНН: string; ОГРН: string }>;
  НомерДела: string;
  СуммаИска: string;
  СтартДата: string;
  Статус: string;
  Категория: string;
}

export interface CourtData {
  точно: {
    дела: CourtCase[];
  };
  неточно: {
    дела: CourtCase[];
  };
}

export interface CompanyCheckResponse {
  id?: number;
  searchResults?: CompanySearchResult[];
  cardData?: CompanyCardData;
  bankruptData?: BankruptData;
  importantFacts?: ImportantFactsData;
  courtData?: CourtData;
  error?: string;
}

@Injectable()
export class CompanyCheckService {
  private readonly dadataToken: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.dadataToken = this.configService.get<string>('DADATA_API_KEY') || '8bbe603c58920b9fa12f811efcb71b63cd6b3433';
  }

  // Поиск через DaData
  async searchCompanyViaDadata(query: string): Promise<CompanySearchResult[]> {
    try {
      const url = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party';
      const response = await firstValueFrom<AxiosResponse<any>>(
        this.httpService.post(url, { query }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Token ' + this.dadataToken,
          },
        }),
      );
      
      const data = response.data;
      if (data.suggestions && data.suggestions.length > 0) {
        return data.suggestions.map((item: any) => ({
          id: 0,
          value: item.value,
          inn: item.data?.inn || '',
          ogrn: item.data?.ogrn || '',
        }));
      }
      
      return [];
    } catch (error: any) {
      console.error('[CompanyCheckService] DaData search error:', error.message);
      return [];
    }
  }

  // Парсинг zachestnyibiznes.ru - поиск компании (быстрый HTTP запрос)
  async searchCompanyViaParsing(query: string): Promise<{ id: number; inn: string; ogrn: string; fullId?: string } | null> {
    try {
      const searchUrl = `https://zachestnyibiznes.ru/search?query=${encodeURIComponent(query)}`;
      console.log('[CompanyCheckService] Fast search URL:', searchUrl);
      
      const response = await firstValueFrom<AxiosResponse<string>>(
        this.httpService.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          },
          timeout: 3000,
        }),
      );
      
      const $ = cheerio.load(response.data);
      let fullId = '';
      let companyId = 0;
      let companyInn = '';
      
      $('#search_result .background-grey-blue-light a[href*="/company/"]').first().each((i, elem) => {
        const href = $(elem).attr('href');
        const match = href?.match(/\/company\/ul\/(\d+)_(\d+)/);
        if (match) {
          fullId = match[1] + '_' + match[2];
          companyId = parseInt(match[1]);
          companyInn = match[2];
        }
      });
      
      if (companyId > 0 && companyInn) {
        console.log('[CompanyCheckService] Found:', companyId, companyInn);
        return { id: companyId, inn: companyInn, ogrn: '', fullId };
      }
      
      return null;
    } catch (error: any) {
      console.error('[CompanyCheckService] Search error:', error.message);
      return null;
    }
  }

  async getFullCompanyInfo(query: string): Promise<CompanyCheckResponse> {
    console.log('[CompanyCheckService] Searching for:', query);
    
    // Быстрый поиск через DaData
    const searchResults = await this.searchCompanyViaDadata(query);
    console.log('[CompanyCheckService] DaData results:', searchResults.length);
    
    if (searchResults.length === 0) {
      return { error: 'Компания не найдена' };
    }
    
    // Возвращаем список компаний без деталей
    return {
      searchResults,
    };
  }

  // Загрузка детальной информации по ИНН
  async getCompanyDetailsByInn(inn: string): Promise<CompanyCheckResponse> {
    console.log('[CompanyCheckService] Loading details for INN:', inn);
    
    // Ищем компанию через zachestnyibiznes.ru по ИНН
    const parsedData = await this.searchCompanyViaParsing(inn);
    
    if (!parsedData) {
      return { error: 'Не удалось найти компанию в Честном Бизнесе' };
    }
    
    console.log('[CompanyCheckService] Found company ID:', parsedData.id, 'fullId:', parsedData.fullId);
    
    // Парсим детальную информацию
    const companyUrlId = parsedData.fullId || parsedData.id;
    const detailedData = await this.parseCompanyPageById(companyUrlId);
    
    // Формируем результат
    const searchResults: CompanySearchResult[] = [{
      id: parsedData.id,
      value: detailedData.cardData?.НаимОКВЭД || inn,
      inn: parsedData.inn,
      ogrn: parsedData.ogrn,
    }];
    
    return {
      id: parsedData.id,
      searchResults,
      cardData: detailedData.cardData,
      importantFacts: detailedData.importantFacts,
      courtData: detailedData.courtData,
    };
  }

  // Парсинг страницы компании (быстрый HTTP запрос)
  async parseCompanyPageById(companyId: number | string): Promise<CompanyCheckResponse> {
    try {
      const url = `https://zachestnyibiznes.ru/company/ul/${companyId}`;
      console.log('[CompanyCheckService] Fast parse URL:', url);
      
      const response = await firstValueFrom<AxiosResponse<string>>(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          },
          timeout: 3000,
        }),
      );
      
      const $ = cheerio.load(response.data);
      const pageText = $('body').text();
      
      const result: CompanyCheckResponse = {
        id: typeof companyId === 'number' ? companyId : parseInt(String(companyId)),
        cardData: {},
        importantFacts: { success: [], warning: [], danger: [] },
        courtData: { точно: { дела: [] }, неточно: { дела: [] } },
      };
      
      // Дата регистрации
      const dateMatch = pageText.match(/Дата регистрации\s*(\d{2}\.\d{2}\.\d{4})/);
      if (dateMatch) {
        result.cardData!.ДатаОГРН = dateMatch[1];
        console.log('[CompanyCheckService] Found date:', dateMatch[1]);
      }
      
      // КПП
      const kppMatch = pageText.match(/КПП\s*[:\-]?\s*(\d{9})/);
      if (kppMatch) {
        result.cardData!.КПП = kppMatch[1];
        console.log('[CompanyCheckService] Found KPP:', kppMatch[1]);
      }
      
      // Адрес - несколько паттернов
      const addressPatterns = [
        /Юридический адрес\s*[:\-]?\s*(\d{6},\s*[^\n]+)/i,
        /Адрес\s*[:\-]?\s*(\d{6},\s*[^\n]+)/i,
        /(\d{6},\s*[А-Яа-я0-9\s.,-]+(?:область|край|республика|г\.|п\.|д\.|ул\.|пер\.)[^\n]+)/i,
      ];
      
      for (const pattern of addressPatterns) {
        const addressMatch = pageText.match(pattern);
        if (addressMatch) {
          result.cardData!.ЮрАдрес = addressMatch[1].trim();
          console.log('[CompanyCheckService] Found address:', result.cardData!.ЮрАдрес);
          break;
        }
      }
      
      // Налоговый режим
      const taxModeMatch = pageText.match(/(?:Специальный)? налоговый режим\s*[:\-]?\s*([^\n,]+)/i);
      if (taxModeMatch) {
        result.cardData!.НалогРежим = taxModeMatch[1].trim();
        console.log('[CompanyCheckService] Found tax mode:', result.cardData!.НалогРежим);
      }
      
      // ОКВЭД
      const okvedMatch = pageText.match(/(?:Основной вид деятельности|ОКВЭД)\s*[:\-]?\s*(?:\d{2}\.\d{2})\s+([^\n]+)/i);
      if (okvedMatch) {
        result.cardData!.НаимОКВЭД = okvedMatch[1].trim();
        console.log('[CompanyCheckService] Found OKVED:', result.cardData!.НаимОКВЭД);
      }
      
      // Судебные дела - статистика
      const totalCasesMatch = pageText.match(/(\d[\d\s]*)\s*судебных?\s*дел/i);
      const totalAmountMatch = pageText.match(/([\d.]+\s*(?:млрд|млн|тыс)\s*₽)/i);
      
      // Рассматривается
      const underConsiderationMatch = pageText.match(/Рассматривается\s*([\d.]+\s*(?:млрд|млн|тыс)\s*₽)/i);
      
      // Завершено
      const completedMatch = pageText.match(/Завершенных\s*([\d.]+\s*(?:млрд|млн|тыс)\s*₽)/i);
      
      if (totalCasesMatch || totalAmountMatch || underConsiderationMatch || completedMatch) {
        result.courtData!.точно.дела.push({
          Истец: [],
          Ответчик: [],
          НомерДела: '',
          СуммаИска: totalAmountMatch?.[0]?.trim() || '',
          СтартДата: '',
          Статус: `Всего дел: ${totalCasesMatch?.[1]?.replace(/\s/g, '') || '0'}`,
          Категория: `Рассматривается: ${underConsiderationMatch?.[1]?.trim() || '—'}, Завершено: ${completedMatch?.[1]?.trim() || '—'}`,
        });
        console.log('[CompanyCheckService] Found court stats:', {
          total: totalCasesMatch?.[1],
          amount: totalAmountMatch?.[0],
          underConsideration: underConsiderationMatch?.[1],
          completed: completedMatch?.[1]
        });
      }
      
      console.log('[CompanyCheckService] Parsed cardData:', result.cardData);
      console.log('[CompanyCheckService] Court stats:', result.courtData!.точно.дела.length > 0 ? result.courtData!.точно.дела[0] : 'none');
      
      return result;
    } catch (error: any) {
      console.error('[CompanyCheckService] Parse error:', error.message);
      return { error: error.message };
    }
  }
}
