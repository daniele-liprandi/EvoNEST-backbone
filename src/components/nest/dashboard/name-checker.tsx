import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BaseCorrectingInput, GNRTaxaDiv } from "@/components/ui/custom/name-correcting-input"
import { ImageGBIFSearch } from "@/components/ImageGBIFSearch"
import { useState } from "react";

export const NameCheckerCard = () => {
    const [GNRdata, setGNRdata] = useState();

    return <Card className=" [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]">
        <CardHeader>
            <CardTitle>Name Checker</CardTitle>
            <CardDescription>
                Check names against the Global Name Resolver.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                <BaseCorrectingInput setGNRData={setGNRdata} />
                {GNRdata && <GNRTaxaDiv GNRdata={GNRdata} />}
                {GNRdata && <ImageGBIFSearch GNRdata={GNRdata} />}
            </div>
        </CardContent>
    </Card>
}