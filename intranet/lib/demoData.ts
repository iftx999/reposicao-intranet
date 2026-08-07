import { addDays, toDateKey } from "@/lib/reports";
import type { Product, StockMovementDaily } from "@/lib/types";

// Dados ficticios para a rota /demo-relatorios. Nada aqui toca o banco: servem
// apenas para visualizar a tela antes de existir historico real.

const companyId = "demo-company";
const sectorBar = "demo-sector-bar";
const sectorCozinha = "demo-sector-cozinha";

const catalog = [
  { name: "Gin Tanqueray 750ml", category: "Destilados", unit: "gf", sector: sectorBar, base: 4.2 },
  { name: "Cerveja Pilsen 600ml", category: "Cervejas", unit: "gf", sector: sectorBar, base: 18 },
  { name: "Limão Taiti", category: "Hortifruti", unit: "kg", sector: sectorBar, base: 3.5 },
  { name: "Água com gás 500ml", category: "Não alcoólicos", unit: "un", sector: sectorBar, base: 9 },
  { name: "Espumante Brut 750ml", category: "Vinhos", unit: "gf", sector: sectorBar, base: 1.1 },
  { name: "Salmão fresco", category: "Peixes", unit: "kg", sector: sectorCozinha, base: 6.4 },
  { name: "Arroz para sushi", category: "Secos", unit: "kg", sector: sectorCozinha, base: 5 },
  { name: "Cream cheese", category: "Laticínios", unit: "kg", sector: sectorCozinha, base: 2.3 }
];

const historyDays = 90;

// PRNG deterministico: a tela precisa ficar igual entre renders e recargas.
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export type DemoDataset = {
  products: Product[];
  rows: StockMovementDaily[];
  firstDataDay: string;
};

export function buildDemoDataset(today = toDateKey(new Date())): DemoDataset {
  const random = mulberry32(20260807);
  const firstDataDay = addDays(today, -(historyDays - 1));
  const rows: StockMovementDaily[] = [];
  const products: Product[] = [];

  catalog.forEach((item, index) => {
    const productId = `demo-product-${index + 1}`;
    let balance = 0;

    // Carga inicial: fica fora das metricas de demanda, mas compoe o saldo.
    const initial = round(item.base * 4);
    balance += initial;
    rows.push({
      company_id: companyId,
      product_id: productId,
      sector_id: item.sector,
      dia: firstDataDay,
      movement_type: "entrada",
      source: "inventory",
      total_delta: initial,
      qtd_movimentos: 1
    });

    for (let dayIndex = 0; dayIndex < historyDays; dayIndex += 1) {
      const dia = addDays(firstDataDay, dayIndex);
      const weekday = new Date(`${dia}T12:00:00`).getDay();
      // Sexta e sabado puxam mais do estoque num bar.
      const weekendBoost = weekday === 5 || weekday === 6 ? 1.9 : weekday === 0 ? 1.3 : 1;

      // Reposicao chega em lote, poucas vezes por semana.
      if (random() < 0.45) {
        const demanda = round(item.base * weekendBoost * (1.7 + random() * 0.8));
        balance += demanda;
        rows.push({
          company_id: companyId,
          product_id: productId,
          sector_id: item.sector,
          dia,
          movement_type: "entrada",
          source: "replenishment",
          total_delta: demanda,
          qtd_movimentos: 1 + Math.floor(random() * 3)
        });
      }

      // Consumo acontece quase todo dia, entao o saldo oscila em vez de so crescer.
      if (random() < 0.92) {
        const baixa = round(Math.min(balance, item.base * weekendBoost * (0.75 + random() * 0.5)));
        if (baixa > 0) {
          balance -= baixa;
          rows.push({
            company_id: companyId,
            product_id: productId,
            sector_id: item.sector,
            dia,
            movement_type: "saida",
            source: "manual",
            total_delta: -baixa,
            qtd_movimentos: 1
          });
        }
      }

      if (random() < 0.05) {
        const compra = round(item.base * (1.5 + random() * 2));
        balance += compra;
        rows.push({
          company_id: companyId,
          product_id: productId,
          sector_id: item.sector,
          dia,
          movement_type: "entrada",
          source: "manual",
          total_delta: compra,
          qtd_movimentos: 1
        });
      }

      if (random() < 0.04) {
        const ajuste = round((random() < 0.5 ? -1 : 1) * item.base * (0.2 + random() * 0.6));
        if (balance + ajuste >= 0) {
          balance += ajuste;
          rows.push({
            company_id: companyId,
            product_id: productId,
            sector_id: item.sector,
            dia,
            movement_type: "ajuste",
            source: "manual",
            total_delta: ajuste,
            qtd_movimentos: 1
          });
        }
      }
    }

    products.push({
      id: productId,
      company_id: companyId,
      sector_id: item.sector,
      name: item.name,
      category: item.category,
      unit: item.unit,
      active: true,
      favorite: false,
      quantity: round(balance),
      min_quantity: round(item.base * 2)
    });
  });

  return { products, rows, firstDataDay };
}
