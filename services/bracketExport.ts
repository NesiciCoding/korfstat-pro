import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export const exportBracketToPDF = async (elementId: string, seasonName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Bracket element not found');
        return;
    }

    try {
        // We temporarily adjust styling if needed to make sure it captures all scrollable content
        const originalOverflow = element.style.overflow;
        const originalWidth = element.style.width;
        const originalHeight = element.style.height;

        // html-to-image needs the full size to render correctly if it's currently scrollable
        element.style.overflow = 'visible';
        element.style.width = 'max-content';
        element.style.height = 'max-content';

        const dataUrl = await toPng(element, { 
            quality: 1.0,
            pixelRatio: 2, // High resolution for printing
            backgroundColor: '#ffffff'
        });

        // Restore original styles immediately
        element.style.overflow = originalOverflow;
        element.style.width = originalWidth;
        element.style.height = originalHeight;

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Calculate dimensions to fit the image on the A4 page while maintaining aspect ratio
        const imgProps = doc.getImageProperties(dataUrl);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        
        // Add title
        doc.setFontSize(20);
        doc.text(`Tournament Bracket - ${seasonName}`, 14, 20);

        // Add the image below the title with a margin
        const yOffset = 30;
        const availableHeight = pdfHeight - yOffset - 10;
        const availableWidth = pdfWidth - 28; // 14mm margin on both sides

        let imgWidth = availableWidth;
        let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        // If the scaled height exceeds the page height, scale it down
        if (imgHeight > availableHeight) {
            imgHeight = availableHeight;
            imgWidth = (imgProps.width * imgHeight) / imgProps.height;
        }

        doc.addImage(dataUrl, 'PNG', 14, yOffset, imgWidth, imgHeight);
        
        // Add generation timestamp
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, pdfHeight - 10);

        doc.save(`bracket_${seasonName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (error) {
        console.error('Failed to generate bracket PDF', error);
        alert('Failed to generate bracket PDF. Ensure the bracket is fully loaded on screen.');
    }
};
