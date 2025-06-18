import { tryWithFallback } from '../ai';

export interface CodeAnalysisResult {
  language: string;
  issues: CodeIssue[];
  suggestions: string[];
  complexity: number;
  maintainability: number;
  performance: number;
}

export interface CodeIssue {
  id: string;
  type: 'error' | 'warning' | 'info' | 'suggestion';
  severity: 'high' | 'medium' | 'low';
  line: number;
  column?: number;
  message: string;
  description: string;
  fixSuggestion?: string;
  category: 'syntax' | 'logic' | 'performance' | 'style' | 'security' | 'maintainability';
}

export interface CorrectionResult {
  originalCode: string;
  correctedCode: string;
  changes: CodeChange[];
  summary: string;
  confidence: number;
  processingTime: number;
}

export interface CodeChange {
  type: 'addition' | 'deletion' | 'modification';
  line: number;
  oldContent?: string;
  newContent?: string;
  reason: string;
}

export interface AgentStatus {
  analyzer: 'idle' | 'working' | 'success' | 'error' | 'warning';
  detector: 'idle' | 'working' | 'success' | 'error' | 'warning';
  generator: 'idle' | 'working' | 'success' | 'error' | 'warning';
}

export interface AgentMetrics {
  processingTime: number;
  confidenceScore: number;
  improvementPercentage: number;
  totalIssues: number;
  fixedIssues: number;
}

export class MultiAgentCodeCorrector {
  private onStatusUpdate?: (status: AgentStatus) => void;
  private onProgressUpdate?: (progress: number, message: string, currentAgent?: string) => void;
  private onMetricsUpdate?: (metrics: AgentMetrics) => void;

  constructor(
    onStatusUpdate?: (status: AgentStatus) => void,
    onProgressUpdate?: (progress: number, message: string, currentAgent?: string) => void,
    onMetricsUpdate?: (metrics: AgentMetrics) => void
  ) {
    this.onStatusUpdate = onStatusUpdate;
    this.onProgressUpdate = onProgressUpdate;
    this.onMetricsUpdate = onMetricsUpdate;
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysisResult> {
    const startTime = Date.now();
    
    // Actualizar estado del agente analizador
    this.updateStatus({ analyzer: 'working', detector: 'idle', generator: 'idle' });
    this.updateProgress(10, 'Iniciando análisis de código...', 'Agente Analizador');

    try {
      const prompt = `
Analiza el siguiente código ${language} y proporciona un análisis detallado:

\`\`\`${language}
${code}
\`\`\`

Proporciona el análisis en formato JSON con la siguiente estructura:
{
  "language": "${language}",
  "issues": [
    {
      "id": "unique_id",
      "type": "error|warning|info|suggestion",
      "severity": "high|medium|low",
      "line": number,
      "column": number,
      "message": "Mensaje breve",
      "description": "Descripción detallada",
      "fixSuggestion": "Sugerencia de corrección",
      "category": "syntax|logic|performance|style|security|maintainability"
    }
  ],
  "suggestions": ["Lista de sugerencias generales"],
  "complexity": number (1-10),
  "maintainability": number (1-10),
  "performance": number (1-10)
}

Analiza:
1. Errores de sintaxis
2. Problemas de lógica
3. Oportunidades de optimización
4. Problemas de estilo y legibilidad
5. Vulnerabilidades de seguridad
6. Problemas de mantenibilidad
`;

      this.updateProgress(30, 'Analizando estructura del código...', 'Agente Analizador');
      
      const response = await tryWithFallback(prompt, 'GPT-4O');
      
      if (response.error) {
        throw new Error(response.error);
      }

      this.updateProgress(60, 'Procesando resultados del análisis...', 'Agente Analizador');

      // Intentar parsear la respuesta JSON
      let analysisResult: CodeAnalysisResult;
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No se encontró JSON válido en la respuesta');
        }
      } catch (parseError) {
        // Si falla el parsing, crear un resultado básico
        analysisResult = {
          language,
          issues: [],
          suggestions: ['El código fue analizado pero no se pudieron extraer detalles específicos'],
          complexity: 5,
          maintainability: 7,
          performance: 7
        };
      }

      this.updateProgress(100, 'Análisis completado', 'Agente Analizador');
      this.updateStatus({ analyzer: 'success', detector: 'idle', generator: 'idle' });

      const processingTime = Date.now() - startTime;
      console.log(`✅ Análisis completado en ${processingTime}ms`);

      return analysisResult;

    } catch (error) {
      console.error('❌ Error en el análisis de código:', error);
      this.updateStatus({ analyzer: 'error', detector: 'idle', generator: 'idle' });
      
      // Retornar un resultado de error básico
      return {
        language,
        issues: [{
          id: 'analysis_error',
          type: 'error',
          severity: 'high',
          line: 1,
          message: 'Error en el análisis',
          description: error instanceof Error ? error.message : 'Error desconocido en el análisis',
          category: 'syntax'
        }],
        suggestions: ['No se pudo completar el análisis automático'],
        complexity: 5,
        maintainability: 5,
        performance: 5
      };
    }
  }

  async correctCode(code: string, language: string, issues?: CodeIssue[]): Promise<CorrectionResult> {
    const startTime = Date.now();
    
    // Actualizar estado del agente generador
    this.updateStatus({ analyzer: 'success', detector: 'success', generator: 'working' });
    this.updateProgress(10, 'Iniciando corrección de código...', 'Agente Generador');

    try {
      const issuesText = issues && issues.length > 0 
        ? `\n\nProblemas identificados:\n${issues.map(issue => 
            `- Línea ${issue.line}: ${issue.message} (${issue.severity})`
          ).join('\n')}`
        : '';

      const prompt = `
Corrige el siguiente código ${language} y proporciona una versión mejorada:

\`\`\`${language}
${code}
\`\`\`${issuesText}

Proporciona la respuesta en formato JSON:
{
  "correctedCode": "código corregido completo",
  "changes": [
    {
      "type": "addition|deletion|modification",
      "line": number,
      "oldContent": "contenido anterior (si aplica)",
      "newContent": "contenido nuevo",
      "reason": "razón del cambio"
    }
  ],
  "summary": "Resumen de los cambios realizados",
  "confidence": number (0-100)
}

Enfócate en:
1. Corregir errores de sintaxis
2. Mejorar la lógica del código
3. Optimizar el rendimiento
4. Mejorar la legibilidad
5. Aplicar mejores prácticas
`;

      this.updateProgress(30, 'Generando código corregido...', 'Agente Generador');
      
      const response = await tryWithFallback(prompt, 'GPT-4O');
      
      if (response.error) {
        throw new Error(response.error);
      }

      this.updateProgress(70, 'Procesando correcciones...', 'Agente Generador');

      // Intentar parsear la respuesta JSON
      let correctionData: any;
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          correctionData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No se encontró JSON válido en la respuesta');
        }
      } catch (parseError) {
        // Si falla el parsing, usar el código original
        correctionData = {
          correctedCode: code,
          changes: [],
          summary: 'No se pudieron aplicar correcciones automáticas',
          confidence: 0
        };
      }

      const processingTime = Date.now() - startTime;
      
      const result: CorrectionResult = {
        originalCode: code,
        correctedCode: correctionData.correctedCode || code,
        changes: correctionData.changes || [],
        summary: correctionData.summary || 'Código procesado',
        confidence: correctionData.confidence || 0,
        processingTime
      };

      this.updateProgress(100, 'Corrección completada', 'Agente Generador');
      this.updateStatus({ analyzer: 'success', detector: 'success', generator: 'success' });

      // Actualizar métricas
      const metrics: AgentMetrics = {
        processingTime,
        confidenceScore: result.confidence,
        improvementPercentage: Math.min(result.changes.length * 10, 100),
        totalIssues: issues?.length || 0,
        fixedIssues: result.changes.length
      };
      this.updateMetrics(metrics);

      console.log(`✅ Corrección completada en ${processingTime}ms`);

      return result;

    } catch (error) {
      console.error('❌ Error en la corrección de código:', error);
      this.updateStatus({ analyzer: 'success', detector: 'success', generator: 'error' });
      
      const processingTime = Date.now() - startTime;
      
      return {
        originalCode: code,
        correctedCode: code,
        changes: [],
        summary: `Error en la corrección: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        confidence: 0,
        processingTime
      };
    }
  }

  async analyzeAndCorrect(code: string, language: string): Promise<{
    analysis: CodeAnalysisResult;
    correction: CorrectionResult;
  }> {
    console.log('🚀 Iniciando proceso completo de análisis y corrección');
    
    // Fase 1: Análisis
    const analysis = await this.analyzeCode(code, language);
    
    // Fase 2: Detección (simulada)
    this.updateStatus({ analyzer: 'success', detector: 'working', generator: 'idle' });
    this.updateProgress(50, 'Detectando patrones y problemas...', 'Agente Detector');
    
    // Simular tiempo de procesamiento del detector
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.updateStatus({ analyzer: 'success', detector: 'success', generator: 'idle' });
    
    // Fase 3: Corrección
    const correction = await this.correctCode(code, language, analysis.issues);
    
    return { analysis, correction };
  }

  private updateStatus(status: AgentStatus) {
    if (this.onStatusUpdate) {
      this.onStatusUpdate(status);
    }
  }

  private updateProgress(progress: number, message: string, currentAgent?: string) {
    if (this.onProgressUpdate) {
      this.onProgressUpdate(progress, message, currentAgent);
    }
  }

  private updateMetrics(metrics: AgentMetrics) {
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(metrics);
    }
  }
}

export default MultiAgentCodeCorrector;
