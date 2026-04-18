import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Stat = {
  label: string;
  value: string;
  hint: string;
};

export function ContributionStats({ title = "Contribution stats", stats }: { title?: string; stats: Stat[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Signals that matter this season, not vanity activity.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{stat.value}</p>
            <p className="mt-2 text-xs text-slate-500">{stat.hint}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

