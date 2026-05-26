"use client"

import React, { useState } from 'react';
import QrCodeFormNew from './QRcodeNewSamplesForm';
import QrCodeFormExisting from './QRcodeExistingSamplesForm';
import { PDFDownloadLink, Document, Page, View, StyleSheet, Image, Text } from '@react-pdf/renderer';
import { useSampleData } from '@/hooks/useSampleData';
import { Button } from '@/components/ui/button';
import { prepend_path } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Conversion constants
const DPI = 72; // Standard DPI for digital documents
const MM_TO_PIXEL = DPI / 25.4; // Conversion factor from mm to pixels

// Paper format constants
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Default margin constants
const DEFAULT_MARGIN = {
  TOP: 12,
  BOTTOM: 12,
  LEFT: 10,
  RIGHT: 10
};

// Label format constants
const VIAL_DIMENSIONS = {
  WIDTH: 35.6,
  HEIGHT: 16.9,
  BARCODE: {
    WIDTH_RATIO: 0.9,  // 90% of label width
    HEIGHT_RATIO: 0.71 // 71% of label height
  }
};

const SLIDES_DIMENSIONS = {
  WIDTH: 21,
  HEIGHT: 13,
  BARCODE: {
    WIDTH_RATIO: 0.62,  // 62% of label width
    HEIGHT_RATIO: 1.0   // 100% of label height
  }
};

const CUSTOM_DIMENSIONS = {
  BARCODE: {
    WIDTH_RATIO: 0.9,
    HEIGHT_RATIO: 0.9
  }
};

// Spacing constants
const LABEL_SPACING = {
  HORIZONTAL: 2.3,
  TEXT: {
    BELOW: 1,
    RIGHT: 2
  }
};

// Font size constants
const FONT_SIZES = {
  default: {
    regular: 6,
    small: 5
  },
  vial: {
    regular: 6,
    small: 5
  },
  slides: {
    regular: 5,
    small: 3.5
  },
  custom: {
    regular: 6,
    small: 5
  }
};

// The formats configuration using constants
const FORMATS = {
  vial: {
    width: VIAL_DIMENSIONS.WIDTH,
    height: VIAL_DIMENSIONS.HEIGHT,
    barcode: {
      width: VIAL_DIMENSIONS.WIDTH * VIAL_DIMENSIONS.BARCODE.WIDTH_RATIO,
      height: VIAL_DIMENSIONS.HEIGHT * VIAL_DIMENSIONS.BARCODE.HEIGHT_RATIO,
      textPosition: 'below' as const
    },
    margins: {
      top: DEFAULT_MARGIN.TOP,
      bottom: DEFAULT_MARGIN.BOTTOM,
      left: DEFAULT_MARGIN.LEFT,
      right: DEFAULT_MARGIN.RIGHT
    }
  },
  slides: {
    width: SLIDES_DIMENSIONS.WIDTH,
    height: SLIDES_DIMENSIONS.HEIGHT,
    barcode: {
      width: SLIDES_DIMENSIONS.WIDTH * SLIDES_DIMENSIONS.BARCODE.WIDTH_RATIO,
      height: SLIDES_DIMENSIONS.HEIGHT * SLIDES_DIMENSIONS.BARCODE.HEIGHT_RATIO,
      textPosition: 'right' as const
    },
    margins: {
      top: DEFAULT_MARGIN.TOP,
      bottom: DEFAULT_MARGIN.BOTTOM,
      left: DEFAULT_MARGIN.LEFT,
      right: DEFAULT_MARGIN.RIGHT
    }
  },
  custom: (size: number) => ({
    width: size,
    height: size,
    barcode: {
      width: size * CUSTOM_DIMENSIONS.BARCODE.WIDTH_RATIO,
      height: size * CUSTOM_DIMENSIONS.BARCODE.HEIGHT_RATIO,
      textPosition: 'below' as const
    },
    margins: {
      top: DEFAULT_MARGIN.TOP,
      bottom: DEFAULT_MARGIN.BOTTOM,
      left: DEFAULT_MARGIN.LEFT,
      right: DEFAULT_MARGIN.RIGHT
    }
  })
};

// Visual styling configuration using constants
const STYLE_THEME = {
  fonts: {
    primary: {
      regular: FONT_SIZES.default.regular,
      small: FONT_SIZES.default.small
    }
  },
  colors: {
    text: {
      primary: '#000000',
      secondary: 'rgb(100, 100, 100)'
    }
  },
  spacing: {
    textGap: {
      below: LABEL_SPACING.TEXT.BELOW,
      right: LABEL_SPACING.TEXT.RIGHT
    }
  }
};

interface MyDocumentProps {
  qrCodes: { url: string, label: string, genus?: string, species?: string }[];
  size: number;
  format: string;
}

const createPDFStyles = (format: any, customSize?: number) => {
  console.log("createPDFStyles called with format:", format, "customSize (MM):", customSize); // Log entry

  const getDimensions = () => {
    if (format === 'custom' && customSize) {
      console.log("Using custom format with size (MM):", customSize); // Log custom path
      if (typeof customSize !== 'number' || customSize <= 0) {
        console.error("Invalid customSize received:", customSize, "Falling back to default.");
        toast.error("Invalid custom size provided. Using default.");
        return FORMATS.vial; // Fallback if customSize is bad
      }
      // Ensure FORMATS.custom expects MM and returns MM dimensions
      return FORMATS.custom(customSize);
    }
    // Handle 'vial' and 'slides' cases explicitly
    if (format === 'vial') {
      console.log("Using vial format");
      return FORMATS.vial;
    }
    if (format === 'slides') {
      console.log("Using slides format");
      return FORMATS.slides;
    }
    // Fallback
    console.warn(`Unexpected format "${format}", falling back to vial dimensions`);
    return FORMATS.vial;
  };

  const dimensions = getDimensions();

  if (!dimensions || typeof dimensions.width !== 'number' || typeof dimensions.height !== 'number' || !dimensions.barcode || typeof dimensions.barcode.width !== 'number' || typeof dimensions.barcode.height !== 'number') {
    console.error("Failed to get valid dimensions object for format:", format, customSize, "Received:", dimensions);
    toast.error(`Internal error: Could not determine valid label dimensions for format "${format}".`);
    return StyleSheet.create({ page: {}, labelContainer: {}, label: {}, barcodeImage: {}, textContainer: {}, sampleName: {}, speciesText: {} }); // Prevent crash
  }
  console.log("Calculated dimensions object (MM values):", JSON.stringify(dimensions)); // Log MM dimensions


  // --- Perform the MM to Pixel/Point conversion ---
  const labelWidthPt = dimensions.width * MM_TO_PIXEL;
  const labelHeightPt = dimensions.height * MM_TO_PIXEL;
  const barcodeWidthPt = dimensions.barcode.width * MM_TO_PIXEL;
  const barcodeHeightPt = dimensions.barcode.height * MM_TO_PIXEL;
  const horizontalGapPt = LABEL_SPACING.HORIZONTAL * MM_TO_PIXEL;
  const textGapBelowPt = LABEL_SPACING.TEXT.BELOW * MM_TO_PIXEL;
  const textGapRightPt = LABEL_SPACING.TEXT.RIGHT * MM_TO_PIXEL;
  const marginTopPt = dimensions.margins.top * MM_TO_PIXEL;
  const marginBottomPt = dimensions.margins.bottom * MM_TO_PIXEL;
  const marginLeftPt = dimensions.margins.left * MM_TO_PIXEL;
  const marginRightPt = dimensions.margins.right * MM_TO_PIXEL;
  // Calculate available page width for labels
  const availableWidthPt = (A4_WIDTH_MM * MM_TO_PIXEL) - marginLeftPt - marginRightPt;


  console.log(`Calculated label size (points): ${labelWidthPt.toFixed(2)}pt x ${labelHeightPt.toFixed(2)}pt`); // Log calculated points
  console.log(`Available page width for labels: ${availableWidthPt.toFixed(2)}pt`);

  const styles = StyleSheet.create({
    page: {
      paddingTop: marginTopPt,
      paddingBottom: marginBottomPt,
      paddingLeft: marginLeftPt,
      paddingRight: marginRightPt,
      // No explicit width/height needed here, Page defaults to size="A4"
    },
    labelContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: horizontalGapPt,
      alignContent: 'flex-start',
      // Ensure it uses the available width defined by page padding
      // No explicit width needed here if it's the direct child of Page with padding
    },
    label: {
      width: labelWidthPt, // Use calculated point value
      height: labelHeightPt, // Use calculated point value
      flexDirection: dimensions.barcode.textPosition === 'right' ? 'row' : 'column',
      alignItems: 'center', // Center items horizontally in row, vertically in column
      justifyContent: dimensions.barcode.textPosition === 'right' ? 'flex-start' : 'center', // Align items along main axis

      // --- DEBUG BORDER ---
      borderWidth: 0.5,
      borderColor: '#ff0000', // Red border
      borderStyle: 'solid',
      // --------------------
    },
    barcodeImage: {
      width: barcodeWidthPt, // Use calculated point value
      height: barcodeHeightPt, // Use calculated point value
      // objectFit: 'contain', // Consider if image scaling is poor
    },
    textContainer: {
      flexGrow: dimensions.barcode.textPosition === 'right' ? 1 : 0, // Only grow if next to barcode
      flexShrink: 1, // Allow shrinking
      width: dimensions.barcode.textPosition === 'right'
        ? (labelWidthPt - barcodeWidthPt - textGapRightPt) // Width available next to barcode
        : labelWidthPt, // Full label width if text is below
      // Ensure width isn't negative if calculations are weird
      maxWidth: labelWidthPt, // Max width is the label width
      paddingLeft: dimensions.barcode.textPosition === 'right' ? textGapRightPt : 0,
      paddingTop: dimensions.barcode.textPosition === 'below' ? textGapBelowPt : 0,
      alignItems: 'center', // Center text block itself
      justifyContent: 'center', // Center content within the block (esp. for column)
      overflow: 'hidden',
      // --- DEBUG BORDER ---
      // borderWidth: 0.5,
      // borderColor: '#0000ff', // Blue border
      // borderStyle: 'solid',
      // --------------------
    },
    sampleName: {
      fontSize: (FONT_SIZES[format as keyof typeof FONT_SIZES] || FONT_SIZES.default).regular,
      fontWeight: 'bold',
      color: STYLE_THEME.colors.text.primary,
      textAlign: 'center',
      wordBreak: 'break-all', // Important for small labels
    },
    speciesText: {
      fontSize: (FONT_SIZES[format as keyof typeof FONT_SIZES] || FONT_SIZES.default).small,
      color: STYLE_THEME.colors.text.secondary,
      textAlign: 'center',
      wordBreak: 'break-all',
      marginTop: 1, // Minimal gap
    }
  });

  // --- ADD FINAL WIDTH LOG ---
  console.log(`Final StyleSheet label width -> ${styles.label.width} pt`);
  // ---------------------------

  return styles;
};

const MyDocument: React.FC<MyDocumentProps> = ({ qrCodes, size, format }) => {
  console.log("MyDocument component rendering with size prop (MM):", size, "and format:", format); // <-- Log
  const styles = createPDFStyles(format, size); // Pass MM size here

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.labelContainer} wrap>
          {qrCodes.map((qrCode, index) => (
            <View key={index} style={styles.label} wrap={false}>
              <Image
                src={{ uri: qrCode.url, method: 'GET', headers: {}, body: '' }} // Use object format for src
                style={styles.barcodeImage}
              // Add cache={false} if images seem stale, but can slow down generation
              // cache={false}
              />
              <View style={styles.textContainer}>
                <Text style={styles.sampleName}>{qrCode.label}</Text>
                {qrCode.genus && qrCode.species && (
                  <Text style={styles.speciesText}>
                    {/* Use non-breaking space or ensure enough width */}
                    {/* Consider italicizing species: style={{ fontStyle: 'italic' }} */}
                    {qrCode.genus} {qrCode.species}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

// --- Add checkExisting function ---
const checkExisting = async (prefix: string, startNumber: number, samplesData: any): Promise<boolean> => {
  // Assuming the check is against the sample ID which is prefix + startNumber (as a hex string)
  const sampleIdToCheck = `${prefix}${startNumber}`;
  if (!samplesData || !Array.isArray(samplesData)) {
    console.warn("checkExisting called with invalid samplesData");
    return false;
  }
  // Ensure comparison is case-insensitive if needed, although ObjectIds are typically lowercase hex
  return samplesData.some((sample: any) => sample._id && sample._id.toLowerCase() === sampleIdToCheck.toLowerCase());
}

const generateQRCodesSequence = async (
  prefix: string,
  startNumber: number,
  numberofqrcodes: number,
  barcodeType: string
): Promise<{ url: string, label: string }[]> => {

  console.log("generateQRCodesSequence called with:", { prefix, startNumber, numberofqrcodes, barcodeType });

  const qrCodes: { url: string, label: string }[] = [];
  const qrBaseUrl = 'https://barcodeapi.org/api/qr';
  const code128BaseUrl = 'https://barcodeapi.org/api/code128';

  for (let i = 0; i < numberofqrcodes; i++) {
    const sampleId = `${prefix}${startNumber + i}`; // This is the label and the source for encoding

    // IMPORTANT: This assumes sampleId forms a valid 24-character hexadecimal string.
    if (sampleId.length !== 24 || !/^[0-9a-fA-F]+$/.test(sampleId)) {
      console.error(`Generated sampleId "${sampleId}" is not a valid 24-character hex string.`);
      toast.error(`Generated ID "${sampleId}" is not valid hex. Skipping.`);
      continue; // Skip this barcode
    }

    let compressed_base64 = '';
    try {
      // Encode the hex string sampleId using Base64 (URL-safe variant)
      compressed_base64 = Buffer.from(sampleId, 'hex').toString('base64')
        .replace(/\+/g, '-')  // Convert + to -
        .replace(/\//g, '_')  // Convert / to _
        .replace(/=+$/, '');  // Remove padding equals
    } catch (error) {
      console.error(`Failed to process sampleId "${sampleId}" as hex:`, error);
      toast.error(`Failed to process generated ID "${sampleId}" as hex. Skipping.`);
      continue; // Skip this barcode if encoding fails
    }

    let url = '';
    // Request fixed size/height for better scaling quality
    if (barcodeType === 'qr') {
      url = `${qrBaseUrl}/${compressed_base64}?size=150`;
    } else if (barcodeType === 'code128') {
      url = `${code128BaseUrl}/${compressed_base64}?text=none&fg=404040&height=50`;
    }

    if (url) {
      // Use the original sampleId (e.g., "PREFIX123...") as the human-readable label
      qrCodes.push({ url: url, label: sampleId });
    }
  }
  console.log("Length of qrCodes (New): ", qrCodes.length);
  if (qrCodes.length === 0 && numberofqrcodes > 0) {
    toast.error("Failed to generate any URLs for new samples. Check console for errors.");
  } else if (qrCodes.length < numberofqrcodes) {
    toast.warning(`Generated ${qrCodes.length} URLs out of ${numberofqrcodes} requested. Check console/toast for errors.`);
  }
  return qrCodes;
};

const generateQRcodesExisting = async (
  // size: number, // We don't strictly need 'size' for URL generation anymore
  start_date: any,
  end_date: any,
  samplesData: any,
  format: string, // Still needed for text logic
  barcodeType: string,
  type: string,
  status: string
): Promise<{ url: string, label: string, genus?: string, species?: string }[]> => {

  // Filter data
  const qrcode_data = samplesData
    .filter((sample: any) => {
      // Defensive check for valid date field
      if (!sample.date) return false;

      const sampleDate = new Date(sample.date);
      // Check if sampleDate is valid
      if (isNaN(sampleDate.getTime())) {
        console.warn(`Invalid date found for sample ID ${sample._id}: ${sample.date}`);
        return false;
      }

      const startDate = start_date ? new Date(start_date) : null;
      const endDate = end_date ? new Date(end_date) : null;

      // Check if filter dates are valid
      if (startDate && isNaN(startDate.getTime())) {
        console.warn("Invalid start date provided:", start_date);
        return false; // Or handle error appropriately
      }
      if (endDate && isNaN(endDate.getTime())) {
        console.warn("Invalid end date provided:", end_date);
        return false; // Or handle error appropriately
      }

      // Adjust end date to include the whole day
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      // Perform filtering logic
      const dateMatch = (!startDate || !endDate) || (sampleDate >= startDate && sampleDate <= endDate);
      const typeMatch = type === 'all' || sample.type === type;
      const statusMatch = status === 'all' || sample.lifestatus === status;

      return dateMatch && statusMatch && typeMatch;
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name)) // Sort alphabetically by name
    .map((sample: any) => ({
      id: sample._id, // Ensure this is the 24-char hex string
      name: sample.name,
      genus: sample.genus,
      species: sample.species
    }));


  // API Base URLs
  const qrBaseUrl = 'https://barcodeapi.org/api/qr';
  const code128BaseUrl = 'https://barcodeapi.org/api/code128';

  const qrCodes = qrcode_data.map((data: { id: string; name: any; genus: any; species: any; }) => {
    if (!data.id || typeof data.id !== 'string' || data.id.length !== 24 || !/^[0-9a-fA-F]+$/.test(data.id)) {
      console.error(`Invalid MongoDB ObjectId found: ${data.id} for sample name: ${data.name}`);
      toast.error(`Invalid ID format encountered for sample "${data.name}". Skipping.`);
      return null; // Skip this entry if ID is invalid
    }

    let compressed_base64 = '';
    try {
      compressed_base64 = Buffer.from(data.id, 'hex').toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch (error) {
      console.error(`Failed to process ID "${data.id}" as hex:`, error);
      toast.error(`Failed to process ID "${data.id}" for sample "${data.name}". Skipping.`);
      return null; // Skip this entry if encoding fails
    }


    let url = '';
    // Request a reasonably large default size for QR, let renderer scale it
    // For Code128, request a fixed height.
    if (barcodeType === 'qr') {
      url = `${qrBaseUrl}/${compressed_base64}?size=150`; // Request 150px size
    } else if (barcodeType === 'code128') {
      url = `${code128BaseUrl}/${compressed_base64}?text=none&fg=404040&height=50`; // Request 50px height
    }

    // Keep text logic based on format (vial/slides show different info)
    const labelData: { url: string, label: string, genus?: string, species?: string } = {
      url: url,
      label: data.name
    };

    if (format !== 'slides') { // Applies to 'vial' and 'custom'
      labelData.genus = data.genus;
      labelData.species = data.species;
    }
    return labelData;

  }).filter(Boolean) as { url: string, label: string, genus?: string, species?: string }[]; // Filter out any nulls from errors

  console.log("Length of qrCodes (Existing): ", qrCodes.length);
  if (qrcode_data.length > 0 && qrCodes.length === 0) {
    toast.error("Found matching samples but failed to generate any barcodes. Check console for errors.");
  } else if (qrCodes.length === 0) {
    toast.info("No existing samples found matching the criteria.");
  }
  return qrCodes;
};



const HomePage: React.FC = () => {
  const [qrCodes, setQRCodes] = useState<{ url: string, label: string, genus?: string, species?: string }[]>([]);
  const [size, setSize] = useState<number>(30);
  const [format, setFormat] = useState<string>('custom');
  const [status, setStatus] = useState<string>('all');
  const { samplesData, samplesError } = useSampleData(prepend_path);

  if (!samplesData) return <div>Loading Samples</div>;

  // --- Handler for New Samples Form ---
  const handleFormSubmitNew = async (data: {
    size: number, // Expect MM from form
    prefix: string,
    startNumber: number,
    numberofqrcodes: number,
    format: string,
    barcodeType: string
  }) => {
    console.log("handleFormSubmitNew received data:", data);
    const { size, prefix, startNumber, numberofqrcodes, format, barcodeType } = data;

    console.log("Form submitted (New) - Setting size state to (MM):", size); // <-- Log MM size
    setSize(size); // Set the size state correctly (in MM)
    setFormat(format); // Set format state

    // Perform check *before* generating
    const firstIdToCheck = `${prefix}${startNumber}`;
    // Basic validation before check
    if (firstIdToCheck.length !== 24 || !/^[0-9a-fA-F]+$/.test(firstIdToCheck)) {
      toast.error(`The starting ID "${firstIdToCheck}" (prefix+startNumber) is not a valid 24-character hex string.`);
      return; // Prevent generation if start ID is invalid
    }

    const exists = await checkExisting(prefix, startNumber, samplesData);
    if (exists) {
      // Use a more informative warning/error, maybe allow override via AlertDialog later
      toast.warning(`The starting ID "${firstIdToCheck}" already exists in the database. Ensure this is intended.`);
      // Consider if you want to stop generation here or just warn
      // return;
    }

    // Clear previous QR codes before generating new ones
    setQRCodes([]);

    // Call generate function (does not need size/format for URL)
    const generatedQRCodes = await generateQRCodesSequence(
      prefix,
      startNumber,
      numberofqrcodes,
      barcodeType
    );
    setQRCodes(generatedQRCodes); // Update state with generated codes
  };

  // --- Handler for Existing Samples Form ---
  const handleFormSubmitExisting = async (data: {
    size: number, // Expect MM from form
    date_start?: any, // Comes as string from date input
    date_end?: any,   // Comes as string from date input
    format: string,
    barcodeType: string,
    type: string,
    status: string
  }) => {
    console.log("handleFormSubmitExisting received data:", data);
    const { size, date_start, date_end, format, barcodeType, type, status } = data;

    console.log("Form submitted (Existing) - Setting size state to (MM):", size); // <-- Log MM size
    setSize(size); // Set the size state correctly (in MM)
    setFormat(format); // Set format state
    setStatus(status); // Set status state if needed

    // Clear previous QR codes before generating new ones
    setQRCodes([]);
    // Pass necessary params to generate function
    const generatedQRCodes = await generateQRcodesExisting(
      date_start, // Pass dates directly (generate function handles conversion)
      date_end,
      samplesData,
      format, // Still needed for text content logic
      barcodeType,
      type,
      status
    );
    setQRCodes(generatedQRCodes); // Update state with generated codes
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">

        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="mx-auto grid max-w-[59rem] flex-1 auto-rows-max gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium">
                  New samples
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex w-300">
                  <QrCodeFormNew onSubmit={handleFormSubmitNew} />
                </div>
                {qrCodes.length > 0 && (
                  <PDFDownloadLink document={<MyDocument qrCodes={qrCodes} size={size} format={format} />} fileName="qrcodes.pdf">
                    {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
                  </PDFDownloadLink>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium">
                  Existing samples
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex w-300">
                  <div className="flex w-300">
                    <QrCodeFormExisting onSubmit={handleFormSubmitExisting} />
                  </div>
                </div>
                {qrCodes.length > 0 && (
                  <PDFDownloadLink
                    document={
                      <MyDocument
                        qrCodes={qrCodes}
                        size={size}
                        format={format}
                      />
                    }
                    fileName="qrcodes.pdf"
                  >
                    {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
                  </PDFDownloadLink>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div >
    </div >
  );
};

export default HomePage;
