/* Factory Design Pattern for Role Access Strategies.

Factory design pattern is used here to create instance of role strategies based 
on given role 'role'. This method is chosen as most part of our codes would
require role checking and call functions based on that which make it hard to read
and may lead to inconsistency. 

The purpose of this factory and strategies are to encapsulate those role checking 
and functions call ensuring consistency throughout all codes that require role 
functionalities.

Extensibility and Maintainability:
- Adding new roles can be done simply by adding new Strategy on role-strategy/strategies
  folder, following the given interface. Don't forget to import it here and modify STRATEGIES.
It improves extensibility and maintainability by letting you add or change role behavior in 
one place instead of updating many files.

*/

import adminRoleStrategy from './strategies/adminRoleStrategy.js';
import caregiverRoleStrategy from './strategies/caregiverRoleStrategy.js';
import doctorRoleStrategy from './strategies/doctorRoleStrategy.js';
import patientRoleStrategy from './strategies/patientRoleStrategy.js';

const STRATEGIES = {
  patient: patientRoleStrategy,
  doctor: doctorRoleStrategy,
  admin: adminRoleStrategy,
  caregiver: caregiverRoleStrategy,
};

export const getRoleStrategy = (role) => {
  const strategy = STRATEGIES[role];
  if (!strategy) {
    const error = new Error('Unsupported role.');
    error.status = 403;
    throw error;
  }

  return strategy;
};
