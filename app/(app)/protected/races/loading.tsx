import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RacesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-9 w-64 rounded bg-muted" />
        <div className="h-4 w-full max-w-xl rounded bg-muted" />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle className="h-5 w-40 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full rounded bg-muted" />
              <div className="mt-4 h-9 w-full rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
