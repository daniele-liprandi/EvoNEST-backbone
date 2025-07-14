"use client"

import { prepend_path } from '@/lib/utils';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../input';
import { Label } from '../label';
import { Skeleton } from '../skeleton';
import { Separator } from '../separator';
import { SearchIcon } from 'lucide-react';


export const GNRTaxaDiv = ({ GNRdata }) => {
    if (GNRdata) {
        const data = GNRdata
        try {
            return (
                <div>
                    <div className="flex h-05 items-center space-x-3 text-muted-foreground text-xs">
                        <div>{data.class}</div>
                        <Separator orientation="vertical" />
                        <div>{data.order}</div>
                        <Separator orientation="vertical" />
                        <div>{data.family}</div>
                        <Separator orientation="vertical" />
                        <div>{data.genus}</div>
                        <Separator orientation="vertical" />
                        <div>{data.species}</div>
                    </div>
                </div>
            )
        } catch (error) {
            return (
                <div>
                    <Label>
                        Taxon not found
                    </Label>
                </div>
            )
        }
    } else
        return (
            <div>
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        )
}



export const BaseCorrectingInput = ({ setGNRData, ...props }) => {
    const [value, setValue] = useState('');

    function handleChange(e) {
        setValue(e.target.value);
    }

    async function handleBlur(e) {
        if (!value) {
            return;
        }
        try {
            const taxa = value
            const response = await fetch(prepend_path + '/api/checknames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taxa, method: "fullTaxaInfo", source: "GNR" })
            });
            if (response.ok) {
                const json = await response.json();
                const correctedName = json.data.canonical_form;
                const data = json.data;
                toast.message("Name corrected to: " + correctedName);
                setValue(correctedName);
                setGNRData(data);
            } else {
                throw new Error('Failed to check names');
            }
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="relative">
            <Input
                type="text"
                value={value}
                placeholder='Enter scientific name'
                onChange={handleChange} // directly use onChange from react-hook-form
                onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(e) }}
                className='pr-8'
                {...props}
            />
            <SearchIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
    );
}

export const NameCorrectingInput = ({ onChange, onBlur, value, placeholder, TaxaHandle, source = "WSC", ...props }) => {

    async function handleBlur(e) {
        if (!value) {
            return;
        }
        try {
            const taxa = value
            const responseCheckNames = await fetch(prepend_path + '/api/checknames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taxa, method: "correctName", source: source })
            });
            if (responseCheckNames.ok) {
                const data = await responseCheckNames.json();
                const correctedName = data.data;
                toast.message("Name corrected to: " + correctedName);
                if (onChange) {
                    onChange({ target: { value: correctedName, name: props.name } });
                }
                if (TaxaHandle) TaxaHandle(correctedName);
            } else {
                throw new Error('Failed to check names');
            }
        } catch (error) {
            console.error(error);
        }

        if (onBlur) {
            onBlur(e); 
        }
    }
    return (
        <div className="relative">
            <Input
                type="text"
                value={value}
                onChange={onChange} 
                onBlur={handleBlur}
                placeholder={placeholder}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(e) }}
                className='pr-8'
                {...props}
            />
            <SearchIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
    );
}

