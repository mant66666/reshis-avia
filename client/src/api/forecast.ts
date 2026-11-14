import { requestJson } from './requestJson';

export type Route = {
  code: string;
  origin: string;
  destination: string;
  basePrice: number;
  dates: string[];
};

export type Forecast = {
  route: string;
  routeName: string;
  date: string;
  price: number;
  seats: number;
  demand: number;
  sales: number;
  quantiles: { quantile: number; demand: number }[];
};

export function getRoutes(signal: AbortSignal) {
  return requestJson<Route[]>('/api/routes', { signal });
}

export function getForecast(route: string, date: string, price: number) {
  const params = new URLSearchParams({ route, date, price: String(price) });
  return requestJson<Forecast>(`/api/forecast?${params}`);
}
