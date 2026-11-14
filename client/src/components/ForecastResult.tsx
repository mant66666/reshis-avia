import type { Forecast } from '../api/forecast';
import { formatDate, formatNumber, ticketUnit } from '../utils/format';

type Props = {
  forecast: Forecast | null;
  calculating: boolean;
  priceChanged: boolean;
};

const rubles = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
});
const compactRubles = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  notation: 'compact',
  maximumFractionDigits: 2,
});

export default function ForecastResult({ forecast, calculating, priceChanged }: Props) {
  const load = forecast && forecast.seats > 0 ? forecast.sales / forecast.seats : 0;
  const revenue = forecast ? forecast.sales * forecast.price : 0;

  return (
    <section className="result-panel" aria-labelledby="result-heading" aria-live="polite" aria-busy={calculating}>
      <div className="result-heading">
        <h2 id="result-heading">Прогноз продаж</h2>
        {forecast && (
          <span className={priceChanged || calculating ? 'result-status result-status-pending' : 'result-status'}>
            {calculating ? 'Рассчитываем…' : priceChanged ? 'Требуется пересчёт' : 'Рассчитан'}
          </span>
        )}
      </div>
      {forecast ? (
        <>
          <p className="flight-name">{forecast.routeName.replace(' — ', ' → ')}</p>
          <p className="flight-details">{formatDate(forecast.date)} · билет {formatNumber(forecast.price)} ₽</p>
          {priceChanged && (
            <p className="result-note">Показан предыдущий прогноз для цены {formatNumber(forecast.price)} ₽.</p>
          )}
          <p className="sales">
            <strong>{formatNumber(forecast.sales)}</strong>
            <span>{ticketUnit(forecast.sales)}</span>
            <span className="sales-capacity">из {formatNumber(forecast.seats)} мест</span>
          </p>
          <p className="sales-description">Медианный прогноз продаж</p>
          <div className="load-label">
            <label htmlFor="flight-load">Прогноз загрузки</label>
            <strong>{Math.round(load * 100)}%</strong>
          </div>
          <meter id="flight-load" className="load-meter" min={0} max={1} value={load} />
          <dl className="result-details">
            <div>
              <dt>Свободные места по прогнозу</dt>
              <dd>{formatNumber(forecast.seats - forecast.sales)}</dd>
            </div>
            <div>
              <dt>Расчётная выручка</dt>
              <dd title={rubles.format(revenue)}>{compactRubles.format(revenue)}</dd>
            </div>
          </dl>
          {forecast.demand > forecast.seats && (
            <p className="result-note">
              Медианный расчётный спрос — {formatNumber(forecast.demand)} {ticketUnit(forecast.demand)}. Продажи ограничены вместимостью рейса.
            </p>
          )}
          {forecast.demand < 0 && <p className="result-note">При этой цене медианный расчётный спрос ниже нуля. Прогноз продаж — 0 билетов.</p>}
        </>
      ) : (
        <p className="result-empty">{calculating ? 'Получаем прогноз…' : 'Выберите рейс, укажите цену и нажмите «Рассчитать прогноз».'}</p>
      )}
    </section>
  );
}
