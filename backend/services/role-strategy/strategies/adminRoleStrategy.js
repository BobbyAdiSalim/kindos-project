/* Strategy for User's Role
Strategy design pattern is used here because the app have multiple different roles
and in most part of our code require us to call functions based on the role.

Instead of having a big if-else statement everytime, we use Strategy and Factory 
(check roleStrategyFactory.js) to get the role and its functionalities.

The purpose of this factory and strategies are to encapsulate those role checking 
and functions call ensuring consistency throughout all codes that require role 
functionalities.

Extensibility and Maintainability:
- Adding a new role (strategy) should include the following functions (INTERFACE):
  - getAppointmentScope(userId)
  - getConnectionScope(userId)
  - getOtherConnectionUserId(connection)
  - buildPrivateProfile(userId)
  - buildPublicProfile(userId)
*/


const unsupported = (message) => {
  const error = new Error(message);
  error.status = 403;
  throw error;
};

const adminRoleStrategy = {
  role: 'admin',

  async getAppointmentScope() {
    unsupported('Unsupported role for appointment access.');
  },

  async getConnectionScope() {
    unsupported('Admins do not have chat connections.');
  },

  getOtherConnectionUserId() {
    return null;
  },

  async buildPrivateProfile() {
    return null;
  },

  async buildPublicProfile() {
    return null;
  },
};

export default adminRoleStrategy;
