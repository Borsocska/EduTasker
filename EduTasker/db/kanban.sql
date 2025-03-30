CREATE DATABASE kanbanDB;

USE kanbanDB;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE board_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  board_id INT NOT NULL,
  shared_user_id INT NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id),
  FOREIGN KEY (shared_user_id) REFERENCES users(id),
  UNIQUE KEY unique_board_share (board_id, shared_user_id)
);


CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL,       
  status ENUM('To-Do', 'In Progress', 'Complete') DEFAULT 'To-Do',
  board_id INT,
  FOREIGN KEY (board_id) REFERENCES boards(id)
);
