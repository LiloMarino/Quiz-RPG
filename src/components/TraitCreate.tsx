import React, { useState } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { useToast } from "../context/ToastContext";
import { addCaracteristica, associateCaracteristicaToTags } from "../database/caracteristica";
import { Caracteristica, FormErrors, TipoCaracteristica } from "../types";
import { handleInputChange } from "../utils/formHelpers";
import { getTipo } from "../utils/util";
import HintCard from "./HintCard";
import HintTooltip from "./HintTooltip";
import { TagSelection } from "./TagSelection";

interface TraitCreateProps {
  tipo: TipoCaracteristica;
  fetchData: (tipo: TipoCaracteristica) => Promise<void>;
}

const TraitCreate: React.FC<TraitCreateProps> = ({ tipo, fetchData }) => {
  const [newTrait, setNewTrait] = useState<Caracteristica>({
    nome: "",
    descricao: "",
    url_imagem: "",
    url_referencia: "",
    tipo: tipo,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({
    nome: false,
  });
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const stringTipo = getTipo(tipo) == "background" ? "o background" : "a " + getTipo(tipo);
  const { showToast } = useToast();

  // Manipulação da Tag
  const handleTagToggle = (id: number) => {
    setSelectedTags((prev) => {
      const newSelectedTags = new Set(prev);
      if (newSelectedTags.has(id)) {
        newSelectedTags.delete(id);
      } else {
        newSelectedTags.add(id);
      }
      return newSelectedTags;
    });
  };

  // Salvar Característica
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação do nome
    newTrait.nome = newTrait.nome.trim();
    if (newTrait.nome === "") {
      setFormErrors({ ...formErrors, nome: true });
      showToast(`Nome d${stringTipo} não pode ser vazio!`, "danger");
      return;
    }

    try {
      const id = await addCaracteristica(newTrait);
      await associateCaracteristicaToTags(id, selectedTags);
      setNewTrait({
        nome: "",
        descricao: "",
        url_imagem: "",
        url_referencia: "",
        tipo: tipo,
      });
      setSelectedTags(new Set());
      showToast(`${getTipo(tipo).charAt(0).toUpperCase() + getTipo(tipo).slice(1)} adicionada com sucesso!`, "success");
      fetchData(tipo);
    } catch (error) {
      showToast(`Não foi possível adicionar, erro: ${error}`, "danger");
    }
  };

  return (
    <Row className="align-items-center h-100">
      <HintCard className="mb-3">
        Para adicionar uma imagem personalizada você precisará de um link direto (URL) da imagem. Você pode fazer o
        upload em algum site como o{" "}
        <a href="https://imgur.com/" target="_blank" rel="noopener noreferrer">
          Imgur
        </a>{" "}
        e obter o link. Em seguida, cole o link no campo de imagem do formulário.
      </HintCard>
      <Col xs={12} md={6} className="mx-auto">
        <Card>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="nome" className="mt-2">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  type="text"
                  name="nome"
                  value={newTrait.nome}
                  onChange={(e) =>
                    handleInputChange(
                      e as React.ChangeEvent<HTMLInputElement>,
                      newTrait,
                      setNewTrait,
                      formErrors,
                      setFormErrors
                    )
                  }
                  className={formErrors.nome ? "is-invalid" : ""}
                  placeholder={`Digite o nome d${stringTipo}`}
                />
              </Form.Group>

              <Form.Group controlId="descricao" className="mt-2">
                <Form.Label>Breve Descrição</Form.Label>
                <Form.Control
                  as="textarea"
                  name="descricao"
                  rows={2}
                  value={newTrait.descricao}
                  onChange={(e) =>
                    handleInputChange(
                      e as React.ChangeEvent<HTMLInputElement>,
                      newTrait,
                      setNewTrait,
                      formErrors,
                      setFormErrors
                    )
                  }
                  placeholder={`Breve descrição d${stringTipo}`}
                />
              </Form.Group>

              <Form.Group controlId="urlImagem" className="mt-2">
                <Form.Label>
                  URL da Imagem <HintTooltip>Imagem a ser exibida para representar {stringTipo}</HintTooltip>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="url_imagem"
                  value={newTrait.url_imagem}
                  onChange={(e) =>
                    handleInputChange(
                      e as React.ChangeEvent<HTMLInputElement>,
                      newTrait,
                      setNewTrait,
                      formErrors,
                      setFormErrors
                    )
                  }
                  placeholder="Digite a URL da imagem"
                />
              </Form.Group>

              <Form.Group controlId="urlReferencia" className="mt-2">
                <Form.Label>
                  URL para Referência{" "}
                  <HintTooltip>
                    Link que será usado para redirecionar para um site externo com mais informações
                  </HintTooltip>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="url_referencia"
                  value={newTrait.url_referencia}
                  onChange={(e) =>
                    handleInputChange(
                      e as React.ChangeEvent<HTMLInputElement>,
                      newTrait,
                      setNewTrait,
                      formErrors,
                      setFormErrors
                    )
                  }
                  placeholder="Digite a URL para referência"
                />
              </Form.Group>

              <Form.Group className="mt-2">
                <Form.Label>
                  Tags para Selecionar <HintTooltip>Selecione as tags que são coerentes com {stringTipo}</HintTooltip>
                </Form.Label>
                <TagSelection selectedTags={selectedTags} handleTagToggle={handleTagToggle} />
              </Form.Group>

              <Button type="submit" variant="success" className="mt-3">
                Criar
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default TraitCreate;
