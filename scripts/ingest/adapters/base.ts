export interface ParsedRow {
  date: Date;
  description: string;
  /** Positivo = débito/gasto, negativo = crédito/entrada */
  amount: number;
  rawData: Record<string, unknown>;
  rowIndex: number;
  sheetName?: string;
}

export type AdapterName = 'xlsx' | 'csv' | 'ofx' | 'pdf-text' | 'pdf-ocr';

export interface IAdapter {
  readonly name: AdapterName;
  canHandle(filePath: string): boolean;
  parse(filePath: string): Promise<ParsedRow[]>;
}
