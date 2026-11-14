import assert from 'node:assert/strict';
import { readCsv } from '../server/src/readCsv.js';

function readNonNegativeNumber(value: string | undefined, field: string): number {
  assert(value !== undefined && value.trim() !== '', `Пустое поле: ${field}`);
  const result = Number(value);
  assert(Number.isFinite(result) && result >= 0, `Некорректное число: ${field}`);
  return result;
}

const routes = readCsv('routes.csv');
const forecast = readCsv('Судаков Егор Алексеевич_my_forecast.csv');
const routeCodes = new Set(routes.map((route) => route.route));

assert.equal(routes.length, 5, 'В справочнике должно быть 5 маршрутов');
assert.equal(routeCodes.size, 5, 'Маршруты в справочнике повторяются');
assert.equal(forecast.length, 155, 'В прогнозе должно быть 155 рейсов');

for (const route of routes) {
  assert(route.route.startsWith('MOW-'), 'Ожидался маршрут из Москвы');
  assert(route.name.trim() !== '', 'Нет названия маршрута');
  for (const field of ['base_price', 'cost_per_passenger', 'price_sensitivity', 'price_min', 'price_max']) {
    readNonNegativeNumber(route[field], field);
  }
  assert(Number(route.price_sensitivity) > 0, 'Чувствительность должна быть положительной');
  assert(Number(route.price_min) <= Number(route.base_price), 'Базовая цена ниже минимальной');
  assert(Number(route.base_price) <= Number(route.price_max), 'Базовая цена выше максимальной');
}

const dates: string[] = [];
for (let day = 1; day <= 30; day++) {
  dates.push(`2026-06-${String(day).padStart(2, '0')}`);
}
dates.push('2026-07-01');

const columns = ['route', 'date', 'seats'];
for (let q = 1; q <= 9; q++) {
  columns.push(`0.${q}_base_demand`, `0.${q}_price`, `0.${q}_price_demand`);
}
assert.deepEqual(Object.keys(forecast[0]), columns, 'Неожиданные столбцы прогноза');

const flights = new Set<string>();
for (const row of forecast) {
  const flight = `${row.route}/${row.date}`;
  assert(routeCodes.has(row.route), `Неизвестный маршрут: ${flight}`);
  assert(dates.includes(row.date), `Дата вне периода: ${flight}`);
  assert(!flights.has(flight), `Повтор рейса: ${flight}`);
  flights.add(flight);

  const seats = readNonNegativeNumber(row.seats, `seats (${flight})`);
  assert(Number.isInteger(seats) && seats > 0, `Некорректная вместимость: ${flight}`);

  for (const suffix of ['base_demand', 'price', 'price_demand']) {
    let previous = 0;
    for (let q = 1; q <= 9; q++) {
      const column = `0.${q}_${suffix}`;
      const value = readNonNegativeNumber(row[column], `${column} (${flight})`);
      assert(value >= previous, `Квантили убывают: ${column} (${flight})`);
      previous = value;
    }
  }
}

for (const route of routes) {
  for (const date of dates) {
    assert(flights.has(`${route.route}/${date}`), `Отсутствует рейс: ${route.route}/${date}`);
  }
}

console.log('Данные проверены: 5 маршрутов, 155 рейсов, 30 столбцов.');
console.log('Период: 01.06.2026–01.07.2026, по 31 дню на маршрут.');
console.log('Повторов, пропусков, отрицательных чисел и убывающих квантилей нет.');
