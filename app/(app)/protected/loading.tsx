import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {["Session", "Races", "Predictions", "Strategies"].map((item) => (
        <Card key={item}>
          <CardHeader>
            <CardTitle className="text-base">{item}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="mt-3 h-3 w-full rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
