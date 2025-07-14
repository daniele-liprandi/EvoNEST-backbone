import { GraphicWalker, ISemanticType, IAnalyticType } from '@kanaries/graphic-walker';
import { useSampleData } from '@/hooks/useSampleData';
import { prepend_path } from '@/lib/utils';

interface Sample {
    _id: string;
    name: string;
    measurement: number;
}

export default function SamplesExplorer() {
    const { samplesData, samplesError } = useSampleData(prepend_path);

    if (!samplesData) {
        return <div>Loading samples data...</div>;
    }

    // Format data for Graphic Walker
    const data = samplesData;

    // Define fields for Graphic Walker
    const fields = [
        { fid: '_id', name: 'id', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
        { fid: 'name', name: 'name', semanticType: 'nominal' as ISemanticType, analyticType: 'measure' as IAnalyticType },
        { fid: 'type', name: 'type', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
        { fid: 'subsampletype', name: 'subsample type', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
        { fid: 'family', name: 'family', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
        { fid: 'genus', name: 'genus', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
        { fid: 'species', name: 'species', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
        { fid: 'sex', name: 'sex', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
        { fid: 'life_stage', name: 'life stage', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
        { fid: 'lifestatus', name: 'status', semanticType: 'nominal' as ISemanticType, analyticType: 'dimension' as IAnalyticType },
    ];

    if (samplesError) {
        return <div>Error loading traits data</div>;
    }

    if (samplesData.length === 0) {
        return <div>Loading traits data...</div>;
    }

    return (
        <GraphicWalker
            data={data}
            fields={fields}
            i18nLang="en" // Set to your preferred language
        />
    );
}