import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const DemoDescription = () => {
    return <Card>
        <CardHeader>
            <CardTitle>Welcome to the demo NEST</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-1">
                <p>
                    This is a demo NEST. In this demo, researchers are collecting <strong>spiders</strong> and subsamples of spiders, in this case <strong>silk</strong>.
                    They are measuring the diameters and the mechanical properties of these spider products.
                </p>
                <p>
                    Explore this demo freely, upload some imaginary spiders, see how to change their life stage, check their feeding status, navigate through their logs and upload some documents.
                </p>
                <p>
                    Keep in mind that your NEST can be tailored for your needs: <strong>in your NEST you will be able to work with plants, animals and every other kind of organism</strong>,
                    thanks to the already implemented integration with the Global Name Resolver.
                    Explore this feature in the dashboard by inserting any scientific name into our Name Checker.
                </p>
                <p>
                    In your own NEST, you will also be able to <strong>fully customise</strong> the <strong>tables</strong>, the <strong>maintenance features</strong>, and the <strong>data</strong> you want to keep on the NEST.
                    From irrigation reminder, to egg hatching procedure, to protocol tracking and establishment - anything that can be put down into numbers can be easily inserted into EvoNEST
                </p>
                <p>
                    Please give us any feedback you have, we are always happy to hear from you and we are constantly working hard to improve EvoNEST!
                </p>
            </div>
        </CardContent>
    </Card>
}