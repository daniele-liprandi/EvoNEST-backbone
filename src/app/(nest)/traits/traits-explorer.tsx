import {
  GraphicWalker,
  ISemanticType,
  IAnalyticType,
} from "@kanaries/graphic-walker";
import { useTraitData } from "@/hooks/useTraitData";
import { prepend_path } from "@/lib/utils";

interface Trait {
  _id: string;
  name: string;
  measurement: number;
  unit: string;
  sampleId: string;
}

export default function TraitsExplorer() {
  const { traitsData, traitsError, isLoading } = useTraitData(
    prepend_path,
    true
  );

  if (isLoading) {
    return <div>Loading traits data...</div>;
  }

  if (!traitsData || traitsData.length === 0) {
    return (<div>No traits data available</div>);
  }

  // Format data for Graphic Walker
  const data = traitsData;

  // Define fields for Graphic Walker
  const fields = [
    {
      fid: "_id",
      name: "id",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "measurement",
      name: "value",
      semanticType: "quantitative" as ISemanticType,
      analyticType: "measure" as IAnalyticType,
    },
    {
      fid: "unit",
      name: "unit",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "type",
      name: "type",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "detail",
      name: "Detail of sample",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "sampletype",
      name: "sample type",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "samplesubtype",
      name: "sample sub type",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "family",
      name: "family",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "genus",
      name: "genus",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "species",
      name: "species",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "sampleName",
      name: "sample",
      semanticType: "nominal" as ISemanticType,
      analyticType: "dimension" as IAnalyticType,
    },
    {
      fid: "nfibres",
      name: "n fibres",
      semanticType: "nominal" as ISemanticType,
      analyticType: "measure" as IAnalyticType,
    },
  ];

  if (traitsError) {
    return <div>Error loading traits data</div>;
  }

  if (traitsData.length === 0) {
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
