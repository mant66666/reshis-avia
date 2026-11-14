import { Router } from 'express';
import { calculateForecast, routeOptions } from './forecast.js';

const router = Router();
const pricePattern = /^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;

router.get('/routes', (_req, res) => {
  res.json(routeOptions);
});

function isFlightDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

router.get('/forecast', (req, res) => {
  const { route, date, price } = req.query;

  if (typeof route !== 'string' || !/^[A-Z]{3}-[A-Z]{3}$/.test(route)) {
    res.status(400).json({ error: 'Укажите код маршрута, например MOW-AER.' });
    return;
  }

  if (!isFlightDate(date)) {
    res.status(400).json({ error: 'Укажите существующую дату в формате ГГГГ-ММ-ДД.' });
    return;
  }

  if (typeof price !== 'string' || !pricePattern.test(price) || !Number.isFinite(Number(price))) {
    res.status(400).json({ error: 'Укажите цену от 0 ₽' });
    return;
  }

  const ticketPrice = Number(price);
  const forecast = calculateForecast(route, date, ticketPrice);
  if (!forecast) {
    res.status(404).json({ error: 'Для этого маршрута и даты прогноза нет.' });
    return;
  }

  res.json(forecast);
});

export default router;
