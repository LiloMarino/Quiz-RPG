import Dexie, { Table } from "dexie";
import {
  Alternativa,
  AlternativaTag,
  Caracteristica,
  CaracteristicaTag,
  Pergunta,
  Questionario,
  QuestionarioPergunta,
  Tag,
} from "../types";
import { saveAs } from "file-saver";

class AppDB extends Dexie {
  questionario!: Table<Questionario>;
  pergunta!: Table<Pergunta>;
  questionario_pergunta!: Table<QuestionarioPergunta>;
  alternativa!: Table<Alternativa>;
  alternativa_tag!: Table<AlternativaTag>;
  tag!: Table<Tag>;
  caracteristica!: Table<Caracteristica>;
  caracteristica_tag!: Table<CaracteristicaTag>;

  // Muito cuidado com o qual dado é indexado!! (Afeta performance)
  constructor() {
    super("RpgDatabase");
    this.version(1).stores({
      questionario: "++id_questionario, nome, default",
      questionario_pergunta: "[id_questionario+id_pergunta], id_questionario, id_pergunta",
      pergunta: "++id_pergunta, pergunta",
      alternativa: "++id_alternativa, id_pergunta, alternativa",
      alternativa_tag: "[id_alternativa+id_tag], id_alternativa, id_tag",
      tag: "++id_tag, &nome, cor",
      caracteristica_tag: "[id_caracteristica+id_tag], id_caracteristica, id_tag",
      caracteristica: "++id_caracteristica, nome, descricao, url_imagem, url_referencia, tipo",
    });
  }
}

/**
 * Função para exportar todos os dados do Dexie para JSON usando file-saver
 *
 */
export const exportDexieToJSON = async () => {
  try {
    // Obter todos os dados de cada tabela
    const caracteristicas = await db.caracteristica.toArray();
    const tags = await db.tag.toArray();
    const caracteristicaTag = await db.caracteristica_tag.toArray();
    const alternativa = await db.alternativa.toArray();
    const alternativaTag = await db.alternativa_tag.toArray();
    const pergunta = await db.pergunta.toArray();
    const questionario = await db.questionario.toArray();
    const questionarioPergunta = await db.questionario_pergunta.toArray();

    // Criar um objeto para armazenar todos os dados
    const data = {
      caracteristicas,
      tags,
      caracteristica_tag: caracteristicaTag,
      alternativa,
      alternativa_tag: alternativaTag,
      pergunta,
      questionario,
      questionario_pergunta: questionarioPergunta,
    };

    // Converter o objeto de dados para JSON
    const json = JSON.stringify(data, null, 2);

    // Criar um blob com os dados JSON
    const blob = new Blob([json], { type: "application/json" });

    // Usar file-saver para salvar o arquivo JSON
    saveAs(blob, "dados-dexie.json");
  } catch (error) {
    console.error("Erro ao exportar dados:", error);
  }
};

/**
 * Função para importar dados do JSON fornecido pelo usuário
 * e caso dê algum erro ele fará um rollback automaticamente
 *
 * @param {File} file Arquivo JSON aberto pelo usuário
 */
export const importJSONFromFile = async (file: File) => {
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error("Falha ao ler o arquivo"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Erro ao ler o arquivo"));
      };

      reader.readAsText(file);
    });
  };

  try {
    // Ler o conteúdo do arquivo
    const content = await readFileAsText(file);
    const data = JSON.parse(content);

    // Passo 1: Guardar o estado atual
    const backup = await getBackup();

    try {
      // Passo 2 e 3: Limpar e adicionar dados ao banco de dados
      await db.transaction("rw", db.caracteristica, db.tag, db.caracteristica_tag, db.alternativa, async () => {
        await db.caracteristica.clear();
        await db.tag.clear();
        await db.caracteristica_tag.clear();
        await db.alternativa.clear();
        await db.caracteristica.bulkAdd(data.caracteristicas);
        await db.tag.bulkAdd(data.tags);
        await db.caracteristica_tag.bulkAdd(data.caracteristica_tag);
        await db.alternativa.bulkAdd(data.alternativa);
      });

      await db.transaction("rw", db.alternativa_tag, db.pergunta, db.questionario, db.questionario_pergunta, async () => {
        await db.alternativa_tag.clear();
        await db.pergunta.clear();
        await db.questionario.clear();
        await db.questionario_pergunta.clear();
        await db.alternativa_tag.bulkAdd(data.alternativa_tag);
        await db.pergunta.bulkAdd(data.pergunta);
        await db.questionario.bulkAdd(data.questionario);
        await db.questionario_pergunta.bulkAdd(data.questionario_pergunta);
      });

      console.log("Dados importados com sucesso!");
    } catch (error) {
      console.error("Erro ao importar dados, restaurando o estado anterior:", error);
      await restoreBackup(backup);
      throw new Error("Falha ao importar dados. Estado anterior restaurado.");
    }
  } catch (error) {
    console.error("Erro ao processar o arquivo:", error);
    throw new Error("Erro ao processar o arquivo. Verifique se o JSON está correto.");
  }
};

/**
 * Função para importar os dados default
 *
 */
export const importDefaultData = async () => {
  // Verificar se o banco de dados está vazio
  const counts = await Dexie.Promise.all([
    db.caracteristica.count(),
    db.tag.count(),
    db.caracteristica_tag.count(),
    db.alternativa.count(),
    db.alternativa_tag.count(),
    db.pergunta.count(),
    db.questionario.count(),
    db.questionario_pergunta.count(),
  ]);

  const isEmpty = counts.every((count) => count === 0);

  if (isEmpty) {
    const response = await fetch("default-data.json");
    const data = await response.json();

    // O banco de dados está vazio, insira os dados padrão
    await db.transaction("rw", db.caracteristica, db.tag, db.caracteristica_tag, db.alternativa, async () => {
      await db.caracteristica.bulkAdd(data.caracteristicas);
      await db.tag.bulkAdd(data.tags);
      await db.caracteristica_tag.bulkAdd(data.caracteristica_tag);
      await db.alternativa.bulkAdd(data.alternativa);
    });

    await db.transaction("rw", db.alternativa_tag, db.pergunta, db.questionario, db.questionario_pergunta, async () => {
      await db.alternativa_tag.bulkAdd(data.alternativa_tag);
      await db.pergunta.bulkAdd(data.pergunta);
      await db.questionario.bulkAdd(data.questionario);
      await db.questionario_pergunta.bulkAdd(data.questionario_pergunta);
    });
    return 1;
  } else {
    return 0;
  }
};

/**
 * Restaura o banco de dados para a versão de backup
 *
 * @param {*} backup Dados de backup para restaurar o banco dados Dexie
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const restoreBackup = async (backup: any) => {
  await db.transaction("rw", db.caracteristica, db.tag, db.caracteristica_tag, db.alternativa, async () => {
    await db.caracteristica.clear();
    await db.tag.clear();
    await db.caracteristica_tag.clear();
    await db.alternativa.clear();
    await db.caracteristica.bulkAdd(backup.caracteristicas);
    await db.tag.bulkAdd(backup.tags);
    await db.caracteristica_tag.bulkAdd(backup.caracteristica_tag);
    await db.alternativa.bulkAdd(backup.alternativa);
  });

  await db.transaction("rw", db.alternativa_tag, db.pergunta, db.questionario, db.questionario_pergunta, async () => {
    await db.alternativa_tag.clear();
    await db.pergunta.clear();
    await db.questionario.clear();
    await db.questionario_pergunta.clear();
    await db.alternativa_tag.bulkAdd(backup.alternativa_tag);
    await db.pergunta.bulkAdd(backup.pergunta);
    await db.questionario.bulkAdd(backup.questionario);
    await db.questionario_pergunta.bulkAdd(backup.questionario_pergunta);
  });
};

/**
 * Função que faz um backup do banco de dados, retorna o backup do banco
 *
 */
const getBackup = async () => {
  const caracteristicas = await db.caracteristica.toArray();
  const tags = await db.tag.toArray();
  const caracteristica_tag = await db.caracteristica_tag.toArray();
  const alternativa = await db.alternativa.toArray();
  const alternativa_tag = await db.alternativa_tag.toArray();
  const pergunta = await db.pergunta.toArray();
  const questionario = await db.questionario.toArray();
  const questionario_pergunta = await db.questionario_pergunta.toArray();
  return {
    caracteristicas,
    tags,
    caracteristica_tag,
    alternativa,
    alternativa_tag,
    pergunta,
    questionario,
    questionario_pergunta,
  };
};

export const db = new AppDB();
