import { z } from 'zod';

import {
  ApiError,
  DayRange,
  integrationSchemas,
  Settings,
  Week,
  WeekQuery,
} from '../../shared/integration.ts';
import { maxPlanDays, WeekPlanQuery } from '../../shared/week-plan.ts';
import { absoluteUrl } from '../public-url.ts';

type JsonSchema = Record<string, unknown>;

const schemaRef = (id: string) => `#/components/schemas/${id}`;

/** Returns the id of a named schema of the integration API. */
function idOf(schema: z.ZodType): string {
  const id = integrationSchemas.get(schema)?.id;
  if (!id) throw new Error('The schema is not in integrationSchemas');
  return id;
}

/** Drops the keys that OpenAPI does not need from a converted schema. */
function clean(schema: JsonSchema): JsonSchema {
  const rest = { ...schema };
  delete rest.$schema;
  delete rest.$id;
  return rest;
}

/** The query parameters of an object schema, one per property. */
function queryParameters(query: z.ZodObject): JsonSchema[] {
  const shape: Record<string, z.ZodType> = query.shape;
  return Object.entries(shape).map(([name, schema]) => {
    const { description, ...json } = clean(z.toJSONSchema(schema, { io: 'input' }));
    return {
      name,
      in: 'query',
      required: !schema.safeParse(undefined).success,
      description,
      schema: json,
    };
  });
}

function jsonResponse(description: string, schema: z.ZodType) {
  return {
    description,
    content: { 'application/json': { schema: { $ref: schemaRef(idOf(schema)) } } },
  };
}

const unauthorized = jsonResponse('The token is missing or is not an integration token.', ApiError);
const badRequest = jsonResponse('The query parameters are not valid.', ApiError);

function buildDocument() {
  const { schemas } = z.toJSONSchema(integrationSchemas, { uri: schemaRef });
  return {
    openapi: '3.1.0',
    info: {
      title: 'Cookbook integration API',
      version: '1',
      description:
        'Reads the week plan of the cookbook for other household systems. ' +
        'Authenticate with the integration token from the profile page of the cookbook.',
    },
    servers: [{ url: absoluteUrl('/api/v1') }],
    security: [{ integrationToken: [] }],
    paths: {
      '/settings': {
        get: {
          operationId: 'getSettings',
          summary: 'Settings of the week plan',
          responses: { 200: jsonResponse('The settings.', Settings), 401: unauthorized },
        },
      },
      '/week': {
        get: {
          operationId: 'getWeek',
          summary: 'The week that contains a date',
          description: 'The server decides which dates belong to the week.',
          parameters: queryParameters(WeekQuery),
          responses: {
            200: jsonResponse('The week with all seven days.', Week),
            400: badRequest,
            401: unauthorized,
          },
        },
      },
      '/days': {
        get: {
          operationId: 'getDays',
          summary: 'The days of a date range',
          description: `From \`from\` to \`to\`, both included, up to ${maxPlanDays} days.`,
          parameters: queryParameters(WeekPlanQuery),
          responses: {
            200: jsonResponse('Each date of the range.', DayRange),
            400: badRequest,
            401: unauthorized,
          },
        },
      },
    },
    components: {
      schemas: Object.fromEntries(Object.entries(schemas).map(([id, s]) => [id, clean(s)])),
      securitySchemes: {
        integrationToken: {
          type: 'http',
          scheme: 'bearer',
          description: 'The integration token of a user.',
        },
      },
    },
  };
}

/** The OpenAPI description of the integration API. */
export const openApiDocument = buildDocument();
