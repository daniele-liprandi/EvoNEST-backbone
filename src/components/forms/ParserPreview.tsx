/**
 * Parser Preview Component
 * 
 * Shows users what traits will be automatically generated based on their experiment type
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Info, Eye } from "lucide-react";

interface ParserInfo {
    type: string;
    label: string;
    description: string;
    supportedTypes: string[];
    requiredFields: string[];
    generatedTraits: Array<{
        name: string;
        unit: string;
        description: string;
    }>;
    version: string;
    requiresStructuredData: boolean;
}

interface ParserPreviewProps {
    experimentType: string;
    hasParserSupport: boolean;
    parserInfo?: ParserInfo | null;
}

export function ParserPreview({ experimentType, hasParserSupport, parserInfo }: ParserPreviewProps) {
    if (!hasParserSupport || !parserInfo) {
        return null;
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2 text-green-700 border-green-300 hover:bg-green-50">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Generated Traits
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-5 w-5" />
                        Automatic Trait Generation - {parserInfo.label}
                    </DialogTitle>
                    <DialogDescription className="text-green-700">
                        {parserInfo.description}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-green-800 mb-3">Traits that will be created:</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {parserInfo.generatedTraits.map((trait, index) => (
                                <div key={index} className="flex flex-col gap-1 p-3 bg-green-50 rounded border border-green-200">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-green-100 text-green-800">
                                            {trait.name}
                                        </Badge>
                                        <span className="text-sm text-gray-600">
                                            ({trait.unit})
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 ml-1">{trait.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {parserInfo.requiredFields.length > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium text-blue-800 mb-1">Required data fields:</p>
                                <p className="text-blue-700">{parserInfo.requiredFields.join(', ')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
