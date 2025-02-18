import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TagMasterCard from "../components/TagMasterCard";
import { deleteTag, getTags } from "../database/tag";
import { Tag } from "../types";
import TagCreate from "../components/TagCreate";
import HintCard from "../components/HintCard";

const Tags: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const navigate = useNavigate();

  const handleEdit = (id: number) => {
    navigate(`/editar-tag/${id}`);
  };

  const handleDelete = async (id: number) => {
    await deleteTag(id);
    setTags((prev) => prev.filter((tag) => tag.id_tag !== id));
  };

  const fetchData = async () => {
    const tagsFromDB = await getTags();
    setTags(tagsFromDB);
  };

  // Carregar tags na montagem inicial do componente
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      <HintCard>
        A tag é uma forma de caracterizar as classes, raças e backgrounds, ela é utilizada tanto na{" "}
        <Link to="/caracteristicas">pesquisa</Link> quanto na elaboração e contabilização da pontuação do <Link to="/questionarios">questionário</Link>.
      </HintCard>
      <TagCreate fetchData={fetchData} />
      {tags.map((tag) => (
        <TagMasterCard key={tag.id_tag} tag={tag} handleEdit={handleEdit} handleDelete={handleDelete} />
      ))}
    </>
  );
};

export default Tags;
