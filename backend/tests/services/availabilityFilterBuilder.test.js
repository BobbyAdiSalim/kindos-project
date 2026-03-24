import { describe, expect, it } from 'vitest';
import { Op } from 'sequelize';
import {
  AvailabilityFilterBuilder,
  buildAvailabilityFilterClauses,
} from '../../services/availability-builder/availability-filter-builder.js';

describe('availability filter builder', () => {
  it('builds baseline clauses with defaults', () => {
    const built = new AvailabilityFilterBuilder({}).build();

    expect(built.slotWhereClause).toEqual({ is_available: true });
    expect(built.patternWhereClause).toEqual({ is_active: true });
    expect(built.doctorWhereClause).toEqual({ verification_status: 'approved' });
  });

  it('applies date, appointment type, time of day, and language filters', () => {
    const built = buildAvailabilityFilterClauses({
      date: '2026-03-22',
      appointmentType: 'virtual',
      timeOfDay: 'morning',
      language: 'English',
    });

    expect(built.slotWhereClause.slot_date).toBe('2026-03-22');
    expect(built.patternWhereClause.day_of_week).toBe(0);
    expect(built.slotWhereClause.appointment_type).toEqual({ [Op.contains]: ['virtual'] });
    expect(built.patternWhereClause.appointment_type).toEqual({ [Op.contains]: ['virtual'] });
    expect(built.slotWhereClause.start_time).toEqual({ [Op.lt]: '12:00:00' });
    expect(built.slotWhereClause.end_time).toEqual({ [Op.gt]: '08:00:00' });
    expect(built.doctorWhereClause.languages).toEqual({ [Op.contains]: ['English'] });
  });
});
