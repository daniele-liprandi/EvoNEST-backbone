"use client"
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

const EquivalentDiameterCalculator = () => {
    const [fibres, setFibres] = useState
        ([
            { diameter: '', number: '' },
            { diameter: '0', number: '0' },
            { diameter: '0', number: '0' },
        ]);
    const [totalArea, setTotalArea] = useState(0);
    const [equivalentDiameter, setEquivalentDiameter] = useState(0);

    useEffect(() => {
        const area = fibres.reduce((acc, fibre) => {
            // Parse the diameter and number values here, right before using them in the calculation
            const diameter = parseFloat(fibre.diameter);
            const number = parseInt(fibre.number, 10); // Assuming number should be an integer
            const radius = isNaN(diameter) ? 0 : diameter / 2;
            const count = isNaN(number) ? 0 : number;
            return acc + Math.PI * radius * radius * count;
        }, 0);
        setTotalArea(area);
        setEquivalentDiameter(2 * Math.sqrt(area / Math.PI));
    }, [fibres]); // Recalculate whenever fibers change

    const handleInputChange = (index: number, field: "diameter" | "number", value: any) => {
        const newFibres = [...fibres];
        // Directly store the value as a string without parsing it here
        newFibres[index][field] = value;
        setFibres(newFibres);
    };

    return (
        <div className="grid flex-1 items-start gap-4 p-4 sm:px-6">
            <Card className='sm:col-span-1'>
                <CardHeader>
                    <CardTitle>Equivalent Diameter Calculator</CardTitle>
                    <CardDescription>
                        Enter the diameter and number of fibres to calculate the total area and equivalent diameter for a circular cross section.
                    </CardDescription>
                </CardHeader>
                {fibres.map((fibre, index) => (
                    <CardContent key={index} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <Input
                                placeholder="Diameter"
                                value={fibre.diameter}
                                onChange={(e) => handleInputChange(index, 'diameter', e.target.value)}
                                className="mr-2"
                            />
                            <Input
                                placeholder="Number"
                                value={fibre.number}
                                onChange={(e) => handleInputChange(index, 'number', e.target.value)}
                            />
                        </div>
                    </CardContent>
                ))}
                <CardFooter className="flex flex-col items-center justify-center p-4 text-center">
                    <div className='text-lg font-semibold'>Total Area: {totalArea.toFixed(3)} um²</div>
                    <div className='text-lg font-semibold'>Equivalent Diameter: {equivalentDiameter.toFixed(3)} um</div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default EquivalentDiameterCalculator;