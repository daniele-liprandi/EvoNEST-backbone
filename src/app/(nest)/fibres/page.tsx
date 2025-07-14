"use client"

import React, { useState, useEffect } from 'react';
import FiberBundleAnalysis from './bundleAnalysis';
import EquivalentDiameterCalculator from './equivalentDiameter';
import NonLinearFibreBundleAnalysis from './nonLinearBundleAnalysis';

const FibreCalculator = () => {
    return (
        <>
            <EquivalentDiameterCalculator />
            <FiberBundleAnalysis />
            <NonLinearFibreBundleAnalysis />
        </>

    );
};

export default FibreCalculator;
