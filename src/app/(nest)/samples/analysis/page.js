"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function AnalysisPage() {

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <h1 className="text-xl font-bold">Analysis</h1>
                </header>
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    <div className="mx-auto grid max-w-[59rem] flex-1 auto-rows-max gap-4">
                        <Link href="/samples/analysis/pivot">
                            <Card className="p-4">
                                <CardHeader>
                                    <CardTitle>Pivot Table</CardTitle>
                                    <CardDescription>Click here to access the interactive pivot table and analyze the data.</CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                        <Link href="/samples/analysis/walker">
                            <Card className="p-4">
                                <CardHeader>
                                    <CardTitle>Graph Generator</CardTitle>
                                    <CardDescription>Click here to access the interactive graph and table generator.</CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                        <Accordion type="single" collapsible className='w-full' defaultValue="item-1">
                            <AccordionItem value="item-1" className='w-full' >
                                <AccordionTrigger >
                                    How to create your own Pivot table in Excel or LibreOffice Calc
                                </AccordionTrigger>
                                <AccordionContent>
                                    <section className="mb-12">
                                        <h2 className="text-2xl font-semibold mb-4">In Microsoft Excel</h2>
                                        <ol className="list-decimal list-inside space-y-2">
                                            <li>
                                                <span>Download the xlsx file by pressing the button above one of the tablesd and open it in Excel.</span>
                                            </li>
                                            <li>
                                                <span>Select the columns that contains the data.</span>
                                            </li>
                                            <li>
                                                <span>Go to the <strong>Insert</strong> tab on the Ribbon.</span>
                                            </li>
                                            <li>
                                                <span>Click on <strong>Table</strong> in the Tables group and check the box confirming that it has headers.</span>
                                            </li>
                                            <li>
                                                <span>On the same tab, click on <strong>PivotTable</strong> in the Tables group.</span>
                                            </li>
                                            <li>
                                                <span>In the Create PivotTable dialog box, choose whether to place the PivotTable in a new worksheet or in an existing one. Click <strong>OK</strong>.</span>
                                            </li>
                                            <li>
                                                <span>The PivotTable Field List will appear on the right side of the screen. Drag and drop fields into the <strong>Rows</strong>, <strong>Columns</strong>, <strong>Values</strong>, and <strong>Filters</strong> areas to build your PivotTable.</span>
                                            </li>
                                            <li>
                                                <span>Customize your PivotTable by sorting, filtering, and formatting as needed.</span>
                                            </li>
                                        </ol>
                                    </section>

                                    <section>
                                        <h2 className="text-2xl font-semibold mb-4">In LibreOffice Calc</h2>
                                        <ol className="list-decimal list-inside space-y-2">
                                            <li>
                                                <span>Download the xlsx file by pressing the button above one of the tablesd and open it in LibreOffice Calc.</span>
                                            </li>
                                            <li>
                                                <span>Select the range of cells that contains the data. Ensure that your data has column headers.</span>
                                            </li>
                                            <li>
                                                <span>Go to the <strong>Data</strong> menu and select <strong>Pivot Table</strong> &gt; <strong>Create</strong>.</span>
                                            </li>
                                            <li>
                                                <span>In the Select Source dialog box, choose whether to use the current selection or specify a different range. Click <strong>OK</strong>.</span>
                                            </li>
                                            <li>
                                                <span>In the Pivot Table Layout dialog box, drag and drop fields into the <strong>Row Fields</strong>, <strong>Column Fields</strong>, <strong>Data Fields</strong>, and <strong>Filter Fields</strong> areas to build your PivotTable.</span>
                                            </li>
                                            <li>
                                                <span>Click <strong>OK</strong> to create the PivotTable.</span>
                                            </li>
                                            <li>
                                                <span>Customize your PivotTable by sorting, filtering, and formatting as needed.</span>
                                            </li>
                                        </ol>
                                    </section>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </main>
            </div>
        </div>
    )
}
