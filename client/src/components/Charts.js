import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, LineChart, Line
} from "recharts";
import { formatCurrency } from "../utils/format";

const CustomTooltip = ({ active, payload, label, currency, region }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#0d1829", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
        <p style={{ color: "#64748b", marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || "#e2e8f0" }}>
            {p.name}: {p.name === "volume" ? Number(p.value).toLocaleString() : formatCurrency(p.value, currency, region)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function PriceChart({ data, symbol, sma20, sma50, currency, region, height = 280 }) {
  if (!data || !data.length) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>No data</div>;

  const isUp = data.length > 1 && data[data.length - 1].close >= data[0].close;
  const color = isUp ? "#22c55e" : "#ef4444";
  const gradId = `grad_${symbol?.replace(/[^a-z0-9]/gi, "")}`;

  // Determine tick interval
  const tickInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "'JetBrains Mono'" }}
            tickLine={false}
            axisLine={{ stroke: "#1e293b" }}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "'JetBrains Mono'" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v) => formatCurrency(v, currency, region)}
            width={70}
          />
          <Tooltip content={<CustomTooltip currency={currency} region={region} />} />
          {sma20 && <ReferenceLine y={sma20} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} label={{ value: "SMA20", fill: "#f59e0b", fontSize: 9, position: "insideTopRight" }} />}
          {sma50 && <ReferenceLine y={sma50} stroke="#a78bfa" strokeDasharray="4 3" strokeWidth={1} label={{ value: "SMA50", fill: "#a78bfa", fontSize: 9, position: "insideTopRight" }} />}
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Volume */}
      <ResponsiveContainer width="100%" height={52}>
        <BarChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
          <Bar dataKey="volume" fill="#1e3a5f" radius={[2, 2, 0, 0]} maxBarSize={8} />
          <XAxis hide />
          <YAxis hide />
          <Tooltip content={<CustomTooltip currency={currency} region={region} />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiniSparkline({ data, color = "#22c55e", width = 64, height = 28 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map((d) => d.close || d.price || 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible", flexShrink: 0 }}>
      <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export function IndexChart({ data, color = "#6366f1", height = 80 }) {
  if (!data || !data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="indexGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="close" stroke={color} strokeWidth={1.5} fill="url(#indexGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
