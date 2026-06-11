import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OpportunitiesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-9 w-72 rounded bg-muted" />
        <div className="h-4 w-full max-w-2xl rounded bg-muted" />
      </section>
      <div className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item}>
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-2 h-5 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle className="h-5 w-48 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((metric) => (
                  <div key={metric}>
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="mt-2 h-4 w-24 rounded bg-muted" />
                  </div>
                ))}
              </div>
              <div className="mt-5 h-24 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
