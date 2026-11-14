import { readCsv } from './readCsv.js';

const routes = readCsv('routes.csv').map((row) => ({
  code: row.route,
  name: row.name,
  basePrice: Number(row.base_price),
  sensitivity: Number(row.price_sensitivity),
}));
const flights = readCsv('Судаков Егор Алексеевич_my_forecast.csv');
const quantileLevels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

export const routeOptions = routes.map((route) => {
  const [origin, destination] = route.name.split(' — ');
  const routeFlights = flights.filter((flight) => flight.route === route.code);
  const dates = routeFlights.map((flight) => flight.date).sort();
  return { code: route.code, origin, destination, basePrice: route.basePrice, dates };
}).filter((route) => route.dates.length > 0);

export function calculateForecast(routeCode: string, date: string, price: number) {
  const route = routes.find((item) => item.code === routeCode);
  const flight = flights.find((row) => row.route === routeCode && row.date === date);
  if (!route || !flight) return null;

  const seats = Number(flight.seats);
  const baseDemand = Number(flight['0.5_base_demand']);
  const priceChange = price - route.basePrice;
  const demandChange = route.sensitivity * priceChange;
  const demand = baseDemand - demandChange;
  const sales = Math.min(seats, Math.max(0, demand));

  const quantiles = quantileLevels.map((quantile) => {
    const demandAtBasePrice = Number(flight[`${quantile}_base_demand`]);
    return { quantile, demand: demandAtBasePrice - demandChange };
  });

  return { route: routeCode, routeName: route.name, date, price, seats, demand, sales, quantiles };
}
