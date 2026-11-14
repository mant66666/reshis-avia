import { useEffect, useRef, useState } from 'react';
import type { Forecast } from './api/forecast';
import brandMark from './assets/brand-mark.svg';
import AccountMenu from './components/AccountMenu';
import DemandChart from './components/DemandChart';
import ForecastForm from './components/ForecastForm';
import ForecastResult from './components/ForecastResult';

export default function App() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [editedPrice, setEditedPrice] = useState<number | null>(null);
  const resultArea = useRef<HTMLDivElement>(null);
  const priceChanged = forecast !== null && editedPrice !== null && editedPrice !== forecast.price;

  useEffect(() => {
    const result = resultArea.current?.firstElementChild;
    if (!forecast || !result || result.getBoundingClientRect().top >= 0) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    result.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  }, [forecast]);

  return (
    <>
      <header className="site-header">
        <div className="page-width header-inner">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">
              <img src={brandMark} alt="" />
            </span>
            <span>Решись <em>Авиа</em></span>
          </span>
          <span className="header-note">Планирование продаж</span>
          <AccountMenu />
        </div>
      </header>

      <main className="page-width">
        <div className="intro">
          <div>
            <h1>Прогноз продаж</h1>
            <p>Оцените продажи билетов при выбранной цене.</p>
          </div>
          <p className="data-period">Данные за 1 июня — 1 июля 2026</p>
        </div>

        <div className="workspace">
          <ForecastForm
            calculating={calculating}
            onCalculatingChange={setCalculating}
            onForecastChange={(result) => {
              setForecast(result);
              setEditedPrice(null);
            }}
            onPriceChange={setEditedPrice}
          />
          <div className="analysis-panel" ref={resultArea}>
            <ForecastResult forecast={forecast} calculating={calculating} priceChanged={priceChanged} />
            {forecast && <DemandChart forecast={forecast} />}
          </div>
        </div>
      </main>
    </>
  );
}
