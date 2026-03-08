/* Builder Design Pattern for SQL Database Filtering

Builder is used here as there may be multiple different type of filters
that user is able to do. Therefore, instead of having a continuous long 
lines of checking and filter applying, we divide it into multiple 
functions.

To build a filter query dictionary for the SQL query, simply call 
build(query). The builder will then call all building functions where 
each functions will check for the 'query' and modify the dictionary 
based on given `query`.

Extensibility and Maintainability:
- Add a new filter by implementing a new builder step.
- Register that step in `build()`.
- Existing filter logic stays isolated and easier to test.
This improves extensibility and maintainability because new filters 
can be added in one small step without changing existing filter code.
*/

import { Op } from 'sequelize';

const TIME_RANGES = {
  morning: { start: '08:00:00', end: '12:00:00' },
  afternoon: { start: '12:00:00', end: '17:00:00' },
  evening: { start: '17:00:00', end: '21:00:00' },
};

export class AvailabilityFilterBuilder {
  constructor(query = {}) {
    this.query = query;
    this.slotWhereClause = {
      is_available: true,
    };
    this.patternWhereClause = {
      is_active: true,
    };
    this.doctorWhereClause = {
      verification_status: 'approved',
    };
  }

  withDate() {
    const date = this.query?.date;
    if (!date) return this;

    this.slotWhereClause.slot_date = date;
    this.patternWhereClause.day_of_week = new Date(`${date}T00:00:00`).getDay();
    return this;
  }

  withAppointmentType() {
    const appointmentType = this.query?.appointmentType;
    if (!appointmentType || appointmentType === 'no-preference' || appointmentType === 'any') {
      return this;
    }

    const containsClause = { [Op.contains]: [appointmentType] };
    this.slotWhereClause.appointment_type = containsClause;
    this.patternWhereClause.appointment_type = containsClause;
    return this;
  }

  withTimeOfDay() {
    const timeOfDay = this.query?.timeOfDay;
    if (!timeOfDay || timeOfDay === 'any') return this;

    const range = TIME_RANGES[timeOfDay];
    if (!range) return this;

    this.slotWhereClause.start_time = { [Op.lt]: range.end };
    this.slotWhereClause.end_time = { [Op.gt]: range.start };
    this.patternWhereClause.start_time = { [Op.lt]: range.end };
    this.patternWhereClause.end_time = { [Op.gt]: range.start };
    return this;
  }

  withLanguage() {
    const language = this.query?.language;
    if (!language || language === 'all' || language === 'any') return this;

    this.doctorWhereClause.languages = { [Op.contains]: [language] };
    return this;
  }

  build() {
    return {
      slotWhereClause: this.slotWhereClause,
      patternWhereClause: this.patternWhereClause,
      doctorWhereClause: this.doctorWhereClause,
    };
  }
}

export const buildAvailabilityFilterClauses = (query) => {
  return new AvailabilityFilterBuilder(query)
    .withDate()
    .withAppointmentType()
    .withTimeOfDay()
    .withLanguage()
    .build();
};
