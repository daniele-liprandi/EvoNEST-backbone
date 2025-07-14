"use client"

import { useState, useEffect } from 'react';
import { RedocStandalone } from 'redoc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Code, Zap, Home } from 'lucide-react';
import Link from 'next/link';

interface DynamicSpecInfo {
  generatedAt: string;
  apiCount: number;
  schemaCount: number;
  version: string;
  generator: string;
}

export default function APIDocs() {
  const [dynamicSpecInfo, setDynamicSpecInfo] = useState<DynamicSpecInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const dynamicSpecUrl = '/api/docs/dynamic';

  // Fetch information about the dynamic spec
  useEffect(() => {
    const fetchDynamicSpecInfo = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(dynamicSpecUrl);
        const spec = await response.json();
        setDynamicSpecInfo({
          generatedAt: spec.info?.generatedAt,
          apiCount: Object.keys(spec.paths || {}).length,
          schemaCount: Object.keys(spec.components?.schemas || {}).length,
          version: spec.info?.version,
          generator: spec.info?.['x-generator']
        });
      } catch (error) {
        console.error('Failed to fetch dynamic spec info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDynamicSpecInfo();
  }, []);
  return (
    <div className="p-6" >
      <div className="xl mx-auto h-full">
        <div className="h-full">
          <RedocStandalone
            specUrl={dynamicSpecUrl}
            options={{
              theme: {
                colors: {
                  primary: {
                    main: '#16a34a' // Green theme for dynamic docs
                  }
                },
                typography: {
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif'
                }
              },
              scrollYOffset: 0,
              hideLoading: true,
              hideHostname: false,
              expandDefaultServerVariables: true,
              menuToggle: true,
              sortPropsAlphabetically: true,
              showExtensions: true,
              hideDownloadButton: false,
              nativeScrollbars: true,
              disableSearch: false,
              expandResponses: "200,201"
            }}
          />
        </div>
      </div>
    </div>
  );
}
