import { React, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-pivottable-custom/pivottable.css';

// Dynamically import PivotTableUI and Plot components to ensure they are only loaded on the client-side
const PivotTableUI = dynamic(() => import('react-pivottable-custom/PivotTableUI'), { ssr: false });

const PivotTableComponent = ({ data }) => {
    const initialState = {
        pivotState: {
            rows: ['genus','parentName','type'],
            cols: ['subsampletype'],
            rendererName: 'Table Heatmap',
        },
    };

    const [state, setState] = useState(initialState.pivotState);


    return (
        <PivotTableUI
            data={data}
            onChange={s => setState(s)}
            {...state}
        />
    );
};

export default PivotTableComponent;
