"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Filter, Globe, Building2, Shield, Info, Sun, Moon, Search, Trash2 } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Sankey
} from "recharts";

const formatCurrency = (n: number, ccy: string = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(Number(n || 0));
const formatNumber = (n: number) => new Intl.NumberFormat("fr-FR").format(Number(n || 0));

const exportToCSV = (rows: any[], filename = "programme.csv") => {
  if (!rows?.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map(r => cols.map(k => `"${String(r[k] ?? "").replaceAll('"','""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const parseFile = async (file: File) => {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".json")) return JSON.parse(text);
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(",").map(h => h.trim());
  return lines.map(line => {
    const vals = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.replaceAll(/^"|"$|/g, "").replaceAll('""','"'));
    const obj: Record<string, any> = {};
    keys.forEach((k, i) => obj[k] = vals[i]);
    ["prime","limite","retention","sinistresNombre","sinistresCout","sinistresAnnee","severiteMax"]
      .forEach(k => obj[k] = obj[k] === undefined ? undefined : Number(String(obj[k]).replace(/[\s\u00A0\.€]/g, '').replace(',', '.')));
    return obj;
  });
};

const MOCK_DATA = [
  { id: "1", client: "Client Global SA", entite: "France Holdings", pays: "France", region: "EMEA", ligne: "PDBI", policeLocale: "FR-PDBI-001", assureur: "Allianz", courtier: "SRS", devise: "EUR", prime: 850000, limite: 100000000, retention: 250000, dateEffet: "2025-01-01", dateEcheance: "2025-12-31", sinistresNombre: 2, sinistresCout: 1200000, sinistresAnnee: 2024, severiteMax: 900000, complianceStatut: "Compliant", commentaires: "Risque industriel – chimie" },
  { id: "2", client: "Client Global SA", entite: "US Manufacturing LLC", pays: "États-Unis", region: "AMER", ligne: "Cyber", policeLocale: "US-CYB-010", assureur: "AIG", courtier: "SRS", devise: "USD", prime: 420000, limite: 50000000, retention: 500000, dateEffet: "2025-04-01", dateEcheance: "2026-03-31", sinistresNombre: 3, sinistresCout: 2800000, sinistresAnnee: 2023, severiteMax: 1500000, complianceStatut: "Partiel", commentaires: "SOC2 partiel – MFA en cours" },
  { id: "3", client: "Client Global SA", entite: "Brazil Agro Ltda", pays: "Brésil", region: "AMER", ligne: "General Liability", policeLocale: "BR-GL-022", assureur: "AXA XL", courtier: "SRS", devise: "USD", prime: 310000, limite: 20000000, retention: 200000, dateEffet: "2025-02-01", dateEcheance: "2026-01-31", sinistresNombre: 1, sinistresCout: 400000, sinistresAnnee: 2024, severiteMax: 400000, complianceStatut: "Compliant", commentaires: "Extension produits export" },
  { id: "4", client: "Client Global SA", entite: "India Tech Pvt", pays: "Inde", region: "APAC", ligne: "Cyber", policeLocale: "IN-CYB-005", assureur: "Chubb", courtier: "SRS", devise: "USD", prime: 180000, limite: 15000000, retention: 300000, dateEffet: "2025-06-01", dateEcheance: "2026-05-31", sinistresNombre: 0, sinistresCout: 0, sinistresAnnee: 2024, severiteMax: 0, complianceStatut: "Compliant", commentaires: "Couverture ransom négociée" },
  { id: "5", client: "Client Global SA", entite: "Germany Logistics GmbH", pays: "Allemagne", region: "EMEA", ligne: "PDBI", policeLocale: "DE-PDBI-031", assureur: "HDI", courtier: "SRS", devise: "EUR", prime: 260000, limite: 40000000, retention: 150000, dateEffet: "2025-03-01", dateEcheance: "2026-02-28", sinistresNombre: 4, sinistresCout: 950000, sinistresAnnee: 2022, severiteMax: 500000, complianceStatut: "Non", commentaires: "Écart wording BI" }
];

const COLORS = ["#6b7280", "#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#f59e0b", "#14b8a6"];

export default function Page() {
  const [rows, setRows] = useState<any[]>(MOCK_DATA);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [ligne, setLigne] = useState("all");
  const [compliance, setCompliance] = useState("all");
  const [dark, setDark] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const filtered = useMemo(() => rows.filter(r => {
    const q = query.trim().toLowerCase();
    const textHit = !q || [r.entite, r.pays, r.assureur, r.policeLocale, r.ligne, r.courtier].some(v => String(v || "").toLowerCase().includes(q));
    const regionHit = region === "all" || r.region === region;
    const ligneHit = ligne === "all" || r.ligne === ligne;
    const compHit = compliance === "all" || String(r.complianceStatut).toLowerCase() === compliance.toLowerCase();
    return textHit && regionHit && ligneHit && compHit;
  }), [rows, query, region, ligne, compliance]);

  const kpis = useMemo(() => {
    const totalPrime = filtered.reduce((s, r) => s + (r.prime || 0), 0);
    const totalLimite = filtered.reduce((s, r) => s + (r.limite || 0), 0);
    const totalRetention = filtered.reduce((s, r) => s + (r.retention || 0), 0);
    const totalSinistres = filtered.reduce((s, r) => s + (r.sinistresCout || 0), 0);
    return { totalPrime, totalLimite, totalRetention, totalSinistres };
  }, [filtered]);

  const dataByLigne = useMemo(() => {
    const map: Record<string, any> = {};
    filtered.forEach(r => {
      const key = r.ligne || "Autres";
      map[key] = map[key] || { name: key, Prime: 0, Sinistres: 0, Retentions: 0 };
      map[key].Prime += r.prime || 0;
      map[key].Sinistres += r.sinistresCout || 0;
      map[key].Retentions += r.retention || 0;
    });
    return Object.values(map);
  }, [filtered]);

  const dataByPays = useMemo(() => {
    const map: Record<string, any> = {};
    filtered.forEach(r => {
      const key = r.pays || "Autres";
      map[key] = map[key] || { name: key, Prime: 0, Sinistres: 0 };
      map[key].Prime += r.prime || 0;
      map[key].Sinistres += r.sinistresCout || 0;
    });
    return Object.values(map).sort((a:any,b:any) => b.Prime - a.Prime).slice(0, 12);
  }, [filtered]);

  const dataByYear = useMemo(() => {
    const map: Record<string, any> = {};
    filtered.forEach(r => {
      const y = r.sinistresAnnee || new Date(r.dateEffet).getFullYear();
      if (!y) return;
      map[y] = map[y] || { annee: String(y), Sinistres: 0, Frequence: 0 };
      map[y].Sinistres += r.sinistresCout || 0;
      map[y].Frequence += r.sinistresNombre || 0;
    });
    return Object.values(map).sort((a:any,b:any) => Number(a.annee) - Number(b.annee));
  }, [filtered]);

  // Radar — type de risque × Limite/Prime
  const dataRadar = useMemo(() => {
    const map: Record<string, { risque: string; Limite: number; Prime: number }> = {};
    filtered.forEach(r => {
      const key = r.ligne || "Autres";
      map[key] = map[key] || { risque: key, Limite: 0, Prime: 0 };
      map[key].Limite += r.limite || 0;
      map[key].Prime += r.prime || 0;
    });
    return Object.values(map);
  }, [filtered]);

  // Sankey — Région → Ligne → Assureur (poids = prime)
  const sankey = useMemo(() => {
    const nodes: { name: string }[] = [];
    const nodeIndex = new Map<string, number>();
    const idx = (name: string) => { if (!nodeIndex.has(name)) nodeIndex.set(name, nodes.push({ name }) - 1); return nodeIndex.get(name)!; };

    const linkMap = new Map<string, number>();
    const addLink = (s: string, t: string, v: number) => { const key = s+"→"+t; linkMap.set(key, (linkMap.get(key) || 0) + v); };

    filtered.forEach(r => {
      const region = r.region || "Autres";
      const ligne = r.ligne || "Autres";
      const assureur = r.assureur || "Autres";
      const v = r.prime || 0; if (!v) return;
      addLink("R:"+region, "L:"+ligne, v);
      addLink("L:"+ligne, "A:"+assureur, v);
    });

    Array.from(linkMap.keys()).forEach(k => { const [s,t] = k.split("→"); idx(s); idx(t); });

    const links = Array.from(linkMap.entries()).map(([k,v]) => { const [s,t] = k.split("→"); return { source: idx(s), target: idx(t), value: v }; });

    nodes.forEach(n => { n.name = n.name.replace(/^R:/, "Région: ").replace(/^L:/, "Ligne: ").replace(/^A:/, "Assureur: "); });

    return { nodes, links } as { nodes: { name: string }[]; links: { source: number; target: number; value: number }[] };
  }, [filtered]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const data = await parseFile(f);
      if (!Array.isArray(data) || !data.length) throw new Error("Fichier vide ou invalide");
      setRows(data.map((r: any, idx: number) => ({ id: r.id ?? String(idx+1), ...r })));
    } catch (err:any) { alert("Échec de l'import: " + (err?.message || err)); }
  };

  const resetFilters = () => { setQuery(""); setRegion("all"); setLigne("all"); setCompliance("all"); };

  const regions = useMemo(() => Array.from(new Set(rows.map(r => r.region).filter(Boolean))), [rows]);
  const lignes = ["PDBI","Cyber","General Liability"];
  const complianceOpts = ["Compliant","Partiel","Non"];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur dark:bg-slate-950/70">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <Shield className="h-6 w-6" />
            <h1 className="text-xl md:text-2xl font-semibold">Dashboard Programmes d’Assurance</h1>
            <Badge variant="secondary" className="ml-2 hidden md:inline-flex">International • Multi-lignes</Badge>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, "programme-filtre.csv")}>Exporter</Button>
              <Label htmlFor="file" className="sr-only">Importer</Label>
              <Input id="file" type="file" accept=".csv,.json" className="max-w-[220px]" onChange={onFile} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setDark(!dark)}>
                    {dark ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Basculer clair/sombre</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Filtres */}
        <section className="mx-auto max-w-7xl px-4 py-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 grid gap-3 md:grid-cols-5 items-end">
              <div className="md:col-span-2">
                <Label>Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="Entité, pays, police, assureur…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8"/>
                </div>
              </div>
              <div>
                <Label>Région</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue placeholder="Toutes"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {regions.map(r => <SelectItem key={String(r)} value={String(r)}>{String(r)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ligne</Label>
                <Select value={ligne} onValueChange={setLigne}>
                  <SelectTrigger><SelectValue placeholder="Toutes"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {lignes.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conformité</Label>
                <Select value={compliance} onValueChange={setCompliance}>
                  <SelectTrigger><SelectValue placeholder="Tous"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {complianceOpts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-5 flex gap-2 justify-end">
                <Button variant="ghost" onClick={resetFilters}><Trash2 className="h-4 w-4 mr-2"/>Réinitialiser</Button>
                <Button><Filter className="h-4 w-4 mr-2"/>Appliquer</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* KPIs */}
        <section className="mx-auto max-w-7xl px-4 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-slate-500">Prime totale</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(kpis.totalPrime)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-slate-500">Limites agrégées</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(kpis.totalLimite)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-slate-500">Rétentions cumulées</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(kpis.totalRetention)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3 flex items-center justify-between">
              <CardTitle className="text-sm text-slate-500">Coût sinistres</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-slate-400"/>
                </TooltipTrigger>
                <TooltipContent>Total cumulé sur les lignes filtrées</TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(kpis.totalSinistres, "EUR")}</CardContent>
          </Card>
        </section>

        {/* Graphs */}
        <section className="mx-auto max-w-7xl px-4 mt-4 grid gap-4 md:grid-cols-12">
          <Card className="md:col-span-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Répartition Prime par Ligne</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataByLigne} dataKey="Prime" nameKey="name" outerRadius={90} label>
                    {dataByLigne.map((_:any, i:number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <RTooltip formatter={(v:any) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-8">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Prime & Sinistres par Pays (Top 12)</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataByPays}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v:number) => v >= 1_000_000 ? `${Math.round(v/1_000_000)}M` : `${Math.round(v/1_000) }k`} />
                  <RTooltip formatter={(v:any) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Prime" />
                  <Bar dataKey="Sinistres" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-5">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Radar — Types de risque × Limite (avec Prime)</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={dataRadar} outerRadius={90}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="risque" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis tickFormatter={(v:number) => v >= 1_000_000 ? `${Math.round(v/1_000_000)}M` : `${Math.round(v/1_000)}k`} />
                  <Radar name="Limite" dataKey="Limite" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} />
                  <Radar name="Prime" dataKey="Prime" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.15} />
                  <Legend />
                  <RTooltip formatter={(v:any) => formatCurrency(v)} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-7">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Sankey — Écoulement du budget (Prime): Région → Ligne → Assureur</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey data={sankey} nodePadding={24} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                  <RTooltip formatter={(v:any) => formatCurrency(v)} />
                </Sankey>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-12">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm">Sinistres — Sévérité & Fréquence (par année)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataByYear}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="annee" />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(v:number) => `${Math.round(v/1000)}k`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <RTooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="Sinistres" />
                  <Line yAxisId="right" type="monotone" dataKey="Frequence" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* Table détaillée */}
        <section className="mx-auto max-w-7xl px-4 mt-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Portefeuille détaillé ({filtered.length} enregistrements)</CardTitle>
                <p className="text-xs text-slate-500">Double-cliquez une ligne pour ouvrir le détail.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3"/> Pays: {new Set(filtered.map(r=>r.pays)).size}</Badge>
                <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3"/> Entités: {new Set(filtered.map(r=>r.entite)).size}</Badge>
              </div>
            </CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                  <tr className="text-left">
                    {["Entité","Pays","Région","Ligne","Police","Assureur","Devise","Prime","Limite","Rétention","Sinistres","Conformité"].map(h => (
                      <th key={h} className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r:any) => (
                    <tr key={r.id} className="border-t hover:bg-slate-50/70 dark:hover:bg-slate-900/60 cursor-pointer" onDoubleClick={() => setDetail(r)}>
                      <td className="px-3 py-2 whitespace-nowrap">{r.entite}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.pays}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.region}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.ligne}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono">{r.policeLocale}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.assureur}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.devise}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(r.prime, r.devise)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(r.limite, r.devise)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(r.retention, r.devise)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(r.sinistresCout, r.devise)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${r.complianceStatut === 'Compliant' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-900' : r.complianceStatut === 'Partiel' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-900' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900'}`}>
                          {r.complianceStatut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      </div>
    </TooltipProvider>
  );
}