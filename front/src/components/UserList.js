import React from 'react';
import { ListGroup } from 'react-bootstrap';

function UserList({ users }) {
  return (
   
    <ListGroup variant="flush">
      
{users.map((user, index) => (
  <ListGroup.Item key={index}>
    {user}
  </ListGroup.Item>
))}
    </ListGroup>
  );
}

export default UserList;