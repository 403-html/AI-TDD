import { readFile } from 'fs/promises';

export default class UserService {
  static async findUser(query: Record<string, unknown>) {
    const usersData = await readFile('examples/user-service/user-db.json', 'utf-8');
    const users = JSON.parse(usersData);
    if (query.id) {
      return users.find((user: Record<string, unknown>) => user.id === query.id);
    } else if (query.name) {
      return users.find((user: Record<string, unknown>) => user.name === query.name);
    }
  }
}