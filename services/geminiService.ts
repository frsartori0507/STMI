
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

export const getProjectInsights = async (project: Project): Promise<string> => {
  // Use strictly process.env.API_KEY for initialization as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Como um assistente inteligente de gestão de projetos, analise o seguinte projeto e forneça um resumo executivo rápido (3 frases) e 3 sugestões de próximas ações.
    
    Projeto: ${project.title}
    Status: ${project.status}
    Descrição: ${project.description}
    Tarefas concluídas: ${project.tasks.filter(t => t.completed).length} de ${project.tasks.length}
    Últimos comentários: ${project.comments.slice(-3).map(c => `${c.authorName}: ${c.content}`).join(' | ')}
    
    Responda em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // response.text is a getter property, not a method
    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com o assistente de IA.";
  }
};
