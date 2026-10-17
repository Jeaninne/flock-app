import type { Prisma } from '../../src/generated/prisma/client.js';

export const DEMO_COMPANY_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_COMPANY_NAME = 'Flock Demo';
export const EMAIL_DOMAIN = 'flock-demo.example'; // .example is reserved (can never be a real mailbox)
export const email = (local: string) => `${local}@${EMAIL_DOMAIN}`;
export const PASSWORD = 'demo_password_123';
export const ROUTES_PER_DAY = 4;
export const ORDERS_PER_ROUTE = 3;
export const HISTORY_DAYS = 7;
export const FAIL_RATE = 0.1;
export const TRAVEL_MIN = 15; // between dropoff points
// text values
export const RECIPIENTS = [
  'Ганна Швець',
  'Дмитро Карнаух',
  'Надія Петренко',
  'Володимир Степаненко',
  'Олесь В.',
  'Степан Волошка',
  'Сергій Л.',
];
export const DROPOFF_COMMENTS = [
  null,
  'залиште в охорони',
  'код домофону 25',
  'залиште у консьєржа',
  'зателефонуйте - за замовленням вийдуть',
];
export const FAIL_REASONS = [
  'Отримувач не відповідає',
  'Неправильна адреса',
  'Відмова від отримання',
];
// complex data
export const TEAMS = [
  {
    dispatcher: { name: 'Ірина Мельник', email: email('iryna') },
    couriers: [
      { name: 'Андрій Бондар', email: email('andrii') },
      { name: 'Марта Коваль', email: email('marta') },
      { name: 'Денис Ткач', email: email('denys') },
    ],
  },
  {
    dispatcher: { name: 'Олег Савчук', email: email('oleh') },
    couriers: [
      { name: 'Софія Лисенко', email: email('sofiia') },
      { name: 'Тарас Гончар', email: email('taras') },
      { name: 'Вікторія Руденко', email: email('viktoriia') },
      { name: 'Максим Олійник', email: email('maksym') },
    ],
  },
];
export const VEHICLES = [
  { type: 'BICYCLE', color: 'GREEN' },
  { type: 'BICYCLE', color: 'BLACK' },
  { type: 'SCOOTER', color: 'WHITE' },
  { type: 'SCOOTER', color: 'RED', legalNumber: 'DEMO003' },
  { type: 'CAR', color: 'GREY', vin: 'DEMVN000000000001', legalNumber: 'DEMO001' },
  { type: 'CAR', color: 'BLUE', vin: 'DEMVN000000000002', legalNumber: 'DEMO002' },
  { type: 'VAN', color: 'WHITE', vin: 'DEMVN000000000003', legalNumber: 'DEMO004' },
] satisfies Omit<Prisma.VehicleCreateManyInput, 'companyId'>[];
// The first addresses become pickup points (one per contact), the rest are customers
export const PICKUP_CONTACTS = [
  { name: 'Компанія «Happy Face»', phone: '+447700900222', comment: 'Запитайте на вході' },
  { name: 'Кав’ярня «Кава»', phone: '+447700900223', comment: null },
  { name: 'Квіткова крамниця «Квіти»', phone: '+447700900224', comment: 'Вхід з двору' },
  { name: 'Книгарня «Книгарня»', phone: '+447700900225', comment: null },
];
