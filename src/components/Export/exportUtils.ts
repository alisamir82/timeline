import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Task, CustomFieldDefinition, CustomFieldValue } from '../../types';

export async function exportPNG(element: HTMLElement): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  const link = document.createElement('a');
  link.download = `timeline-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportPDF(element: HTMLElement): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pdfWidth = imgWidth * 0.75;
  const pdfHeight = imgHeight * 0.75;

  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`timeline-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportCSV(
  tasks: Task[],
  customFields: CustomFieldDefinition[],
  customFieldValues: CustomFieldValue[]
): void {
  const headers = [
    'Title',
    'Type',
    'Start Date',
    'End Date',
    'Duration',
    'Owner',
    'Status',
    'RAG',
    '% Complete',
    'Tags',
    'Notes',
    ...customFields.map((f) => f.name),
  ];

  const rows = tasks.map((task) => {
    const cfValues = customFields.map((field) => {
      const val = customFieldValues.find(
        (v) => v.taskId === task.id && v.fieldDefinitionId === field.id
      );
      return val?.value || '';
    });

    return [
      task.title,
      task.type,
      task.startDate,
      task.endDate,
      String(task.duration),
      task.ownerText,
      task.status,
      task.rag,
      String(task.percentComplete),
      task.tags.join('; '),
      task.notes.replace(/\n/g, ' '),
      ...cfValues,
    ];
  });

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent =
    [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join(
      '\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.download = `timeline-${new Date().toISOString().slice(0, 10)}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}
