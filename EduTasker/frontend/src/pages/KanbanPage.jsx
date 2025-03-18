import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./KanbanPage.css";

const KanbanPage = () => {
  const { boardId } = useParams();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:5000/tasks/${boardId}`).then((response) => {
      setTasks(response.data);
    });
  }, [boardId]);

  const updateTaskPosition = (taskId, newStatus) => {
    axios.put(`http://localhost:5000/tasks/update/${taskId}`, { status: newStatus })
      .then(() => console.log("Task updated in DB"))
      .catch(err => console.error("Error updating task:", err));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const updatedTasks = tasks.map(task => {
      if (task.id === parseInt(result.draggableId)) {
        task.status = result.destination.droppableId;
        updateTaskPosition(task.id, task.status);
      }
      return task;
    });
    
    setTasks(updatedTasks);
  };

  const columns = ["To-Do", "In Progress", "Complete"];
  return (
    <div className="kanban-container">
      <h1 className="kanban-title">Kanban Board</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-columns">
          {columns.map((col) => (
            <Droppable droppableId={col} key={col}>
              {(provided) => (
                <div className="kanban-column" ref={provided.innerRef} {...provided.droppableProps}>
                  <h2>{col}</h2>
                  {tasks.filter(task => task.status === col).map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          className="kanban-task"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          {task.title}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanPage;