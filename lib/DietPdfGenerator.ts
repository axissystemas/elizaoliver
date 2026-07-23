import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChineseDietPrescription } from '@/types/dietotherapy';

export const DietPdfGenerator = {
  generatePrescriptionPdf: (
    presc: ChineseDietPrescription,
    reportType: 'clinical' | 'simplified' = 'simplified'
  ) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    let currentY = 45; // Start content below header margin

    // 1. Draw Clinic Header Banner (on page 1)
    const drawHeaderOnPageOne = () => {
      // Draw geometric clinic logo (Emerald color)
      doc.setFillColor(15, 82, 56); // #0F5238
      doc.rect(marginX, 12, 10, 10, 'F');
      doc.setFillColor(34, 197, 94); // Light Green
      doc.triangle(marginX + 5, 12, marginX + 10, 17, marginX + 5, 22, 'F');

      // Clinic Name
      doc.setTextColor(15, 82, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('AXIS GESTÃO CLÍNICA', marginX + 13, 19);

      // Clinic details
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Av. Paulista, 1000 - Bela Vista, São Paulo/SP | Tel: (11) 99999-9999', marginX + 13, 23);

      // Divider line
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.5);
      doc.line(marginX, 27, pageWidth - marginX, 27);
    };

    drawHeaderOnPageOne();

    // 2. Patient / Professional Info block
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Paciente: ${presc.patient_name || 'Paciente'}`, marginX, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Data de Emissão: ${new Date(presc.created_at).toLocaleDateString('pt-BR')}`, marginX, currentY + 5);
    doc.text(`Vigência Sugerida: ${presc.period || '30 dias'}`, marginX, currentY + 10);
    
    // Professional details
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Profissional: ${presc.created_by}`, pageWidth - marginX - 60, currentY, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Registro: ${presc.professional_registry || 'CRN-3 12345/SP'}`, pageWidth - marginX - 60, currentY + 5, { align: 'left' });

    currentY += 18;

    // 3. Document Title / Type Banner
    doc.setFillColor(241, 245, 249); // Slate-100 bg
    doc.rect(marginX, currentY, pageWidth - (marginX * 2), 12, 'F');
    doc.setTextColor(15, 82, 56);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    
    const bannerTitle = reportType === 'clinical' 
      ? 'DOSSIÊ CLÍNICO DE DIETOTERAPIA CHINESA' 
      : 'PLANO NUTRICIONAL E GUIA DE ORIENTAÇÃO ALIMENTAR';
    doc.text(bannerTitle, marginX + 4, currentY + 7.5);
    currentY += 18;

    // 4. Clinical Context vs Patient Simplified Context
    if (reportType === 'clinical') {
      doc.setTextColor(15, 82, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DIAGNÓSTICO ENERGÉTICO E DE SÍNDROMES (MTC)', marginX, currentY);
      currentY += 5;
      
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Padrão de Desarmonia Principal: ${presc.disharmony_pattern}`, marginX, currentY);
      currentY += 5;

      if (presc.secondary_patterns && presc.secondary_patterns.length > 0) {
        doc.text(`Padrões Secundários: ${presc.secondary_patterns.join(', ')}`, marginX, currentY);
        currentY += 5;
      }
      
      if (presc.treatment_principles && presc.treatment_principles.length > 0) {
        doc.text(`Princípios de Tratamento Clínico: ${presc.treatment_principles.join(', ')}`, marginX, currentY);
        currentY += 5;
      }

      currentY += 5;
    } else {
      // Simplified version: Translate clinical objective to patient language
      doc.setTextColor(15, 82, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('OBJETIVO DO SEU PLANO ALIMENTAR', marginX, currentY);
      currentY += 5;

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      const objectiveText = presc.accessible_objective || 
        `Este plano alimentar foi elaborado para harmonizar a sua digestão, fortalecer a energia vital de seus órgãos (${presc.treatment_principles?.join(', ') || 'fortalecimento geral'}) e auxiliar no combate aos sinais de desequilíbrio como cansaço e queixas digestivas de forma natural e integrativa.`;
      
      const splitObjective = doc.splitTextToSize(objectiveText, pageWidth - (marginX * 2));
      doc.text(splitObjective, marginX, currentY);
      currentY += (splitObjective.length * 4) + 4;
    }

    // 5. Food Categories Section (Prioritize, Moderate, Avoid)
    const prioritis = presc.items.filter(i => i.recommendation_level === 'prioritize');
    const moderates = presc.items.filter(i => i.recommendation_level === 'moderate');
    const avoids = presc.items.filter(i => i.recommendation_level === 'avoid');

    const renderFoodTable = (title: string, list: any[], color: [number, number, number]) => {
      if (list.length === 0) return;

      // Add a header/title for the table
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(title, marginX, currentY);
      currentY += 3;

      const body = list.map(item => {
        // Clinical version includes flavors/channels, Simplified version only prep modes
        const flavorsText = item.food_flavors?.join(', ') || '';
        const channelsText = item.food_channels?.join(', ') || '';
        
        return reportType === 'clinical' 
          ? [item.food_name, item.food_thermal_nature, `${flavorsText} / ${channelsText}`, item.custom_prep_notes || 'Livre', item.frequency || 'Livre']
          : [item.food_name, item.food_thermal_nature, item.custom_prep_notes || 'A critério culinário', item.frequency || 'Consumo livre'];
      });

      const headers = reportType === 'clinical'
        ? [['Alimento', 'Natureza', 'Sabor / Tropismo', 'Forma de Preparo', 'Frequência']]
        : [['Alimento', 'Característica', 'Forma de Preparo Recomendada', 'Frequência Sugerida']];

      autoTable(doc, {
        startY: currentY,
        head: headers,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: color, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8.5 },
        margin: { top: 35, bottom: 25, left: marginX, right: marginX },
        didDrawPage: () => {}
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    };

    renderFoodTable('💚 ALIMENTOS RECOMENDADOS PARA PRIORIZAR:', prioritis, [16, 124, 65]);
    
    // Check page limits before next table
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 35;
    }
    
    renderFoodTable('💛 ALIMENTOS PARA CONSUMIR COM MODERAÇÃO:', moderates, [180, 120, 10]);

    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 35;
    }

    renderFoodTable('🔴 ALIMENTOS A EVITAR TEMPORARIAMENTE:', avoids, [220, 38, 38]);

    // 6. General Culinaries Recommendations
    if (presc.general_recommendations) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 35;
      }
      doc.setTextColor(15, 82, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('RECOMENDAÇÕES CULINÁRIAS E GERAIS', marginX, currentY);
      currentY += 5;

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitGeneral = doc.splitTextToSize(presc.general_recommendations, pageWidth - (marginX * 2));
      doc.text(splitGeneral, marginX, currentY);
      currentY += (splitGeneral.length * 4) + 6;
    }

    // 7. Meal Suggestions
    if (presc.meal_suggestions) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 35;
      }
      doc.setTextColor(15, 82, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SUGESTÕES DE REFEIÇÕES E COMBINAÇÕES CULINÁRIAS', marginX, currentY);
      currentY += 5;

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitMeals = doc.splitTextToSize(presc.meal_suggestions, pageWidth - (marginX * 2));
      doc.text(splitMeals, marginX, currentY);
      currentY += (splitMeals.length * 4) + 6;
    }

    // 8. Individualized Notes
    if (presc.individualized_notes) {
      if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = 35;
      }
      doc.setTextColor(15, 82, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('OBSERVAÇÕES CLÍNICAS INDIVIDUALIZADAS', marginX, currentY);
      currentY += 5;

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(presc.individualized_notes, pageWidth - (marginX * 2));
      doc.text(splitNotes, marginX, currentY);
      currentY += (splitNotes.length * 4) + 6;
    }

    // 9. Reevaluation Date
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 35;
    }
    const nextReeval = presc.reevaluation_date 
      ? new Date(presc.reevaluation_date).toLocaleDateString('pt-BR') 
      : 'A definir no retorno';
    doc.setTextColor(15, 82, 56);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`📅 PRÓXIMA REAVALIAÇÃO SUGERIDA: ${nextReeval}`, marginX, currentY);
    currentY += 8;

    // 10. Safety Warning Section
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 35;
    }
    doc.setFillColor(254, 242, 242); // Light red warning bg
    doc.rect(marginX, currentY, pageWidth - (marginX * 2), 15, 'F');
    doc.setDrawColor(248, 113, 113); // Red border
    doc.setLineWidth(0.3);
    doc.rect(marginX, currentY, pageWidth - (marginX * 2), 15);
    
    doc.setTextColor(153, 27, 27); // Dark red
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('AVISO DE SEGURANÇA:', marginX + 4, currentY + 5);
    doc.setFont('helvetica', 'normal');
    
    const warningText = presc.safety_warning || 
      'As orientacoes dietoterapicas contidas neste guia sao baseadas na Tradicao de Medicina Chinesa e atuam como suporte preventivo e integrativo. Nao substituem recomendacoes de diagnosticos medicos, medicamentos de uso continuo ou tratamentos convencionais.';
    const splitWarning = doc.splitTextToSize(warningText, pageWidth - (marginX * 2) - 8);
    doc.text(splitWarning, marginX + 4, currentY + 9);

    // 11. Add Header and Footer decorations to all pages (Centering Page Numbers)
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Draw Header decoration (top dark line) on pages > 1
      if (i > 1) {
        doc.setFillColor(15, 82, 56);
        doc.rect(0, 0, pageWidth, 5, 'F');
        
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('ORIENTAÇÃO DIETOTERÁPICA CHINESA', marginX, 12);
        doc.text(`Paciente: ${presc.patient_name || 'Paciente'}`, pageWidth - marginX - 50, 12, { align: 'left' });
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(marginX, 15, pageWidth - marginX, 15);
      }

      // Draw Footer on all pages
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(marginX, pageHeight - 16, pageWidth - marginX, pageHeight - 16);

      doc.setTextColor(148, 163, 184); // Slate-400
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Axis Gestao Clinica - CRM/CRN/MTC Integrado', marginX, pageHeight - 11);
      
      // Page Number Centered
      const pageText = `Pagina ${i} de ${pageCount}`;
      doc.text(pageText, pageWidth / 2, pageHeight - 11, { align: 'center' });
      
      doc.text(`Versao ${presc.version_number || 1}`, pageWidth - marginX, pageHeight - 11, { align: 'right' });
    }

    return doc;
  }
};
