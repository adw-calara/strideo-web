import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OpportunityNotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opportunity not visible</CardTitle>
        <CardDescription>
          This Opportunity is not published, is no longer visible, or could not
          be found in the protected read path.
        </CardDescription>
        <div className="pt-2">
          <Button asChild variant="outline">
            <Link href="/protected/opportunities">Back to feed</Link>
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
