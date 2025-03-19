export function createCalendar(): void {
  const existingModal = document.getElementById('turboin-calendar-modal');
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  const modal = document.createElement('div');
  modal.id = 'turboin-calendar-modal';
  modal.className = 'turboin-modal';

  const modalContent = document.createElement('div');
  modalContent.className = 'turboin-modal-content';

  const header = document.createElement('div');
  header.className = 'turboin-calendar-header';

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.className = 'turboin-close-button';
  closeButton.onclick = () => document.body.removeChild(modal);

  const title = document.createElement('h2');
  title.textContent = 'Calendar';

  header.appendChild(title);
  header.appendChild(closeButton);

  const calendar = createCalendarElement();

  modalContent.appendChild(header);
  modalContent.appendChild(calendar);
  modal.appendChild(modalContent);

  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  const keyListener = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', keyListener);
    }
  };

  document.addEventListener('keydown', keyListener);
}

function createCalendarElement(): HTMLElement {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const calendarContainer = document.createElement('div');
  calendarContainer.className = 'turboin-calendar-container';

  const monthYearHeader = document.createElement('div');
  monthYearHeader.className = 'turboin-month-year-header';

  const prevMonthBtn = document.createElement('button');
  prevMonthBtn.innerHTML = '&laquo;';
  prevMonthBtn.className = 'turboin-month-nav';

  const monthYearDisplay = document.createElement('div');
  monthYearDisplay.textContent = `${getMonthName(currentMonth)} ${currentYear}`;

  const nextMonthBtn = document.createElement('button');
  nextMonthBtn.innerHTML = '&raquo;';
  nextMonthBtn.className = 'turboin-month-nav';

  monthYearHeader.appendChild(prevMonthBtn);
  monthYearHeader.appendChild(monthYearDisplay);
  monthYearHeader.appendChild(nextMonthBtn);

  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'turboin-calendar-grid';

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  daysOfWeek.forEach((day) => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'turboin-calendar-day-header';
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });

  const firstDay = new Date(currentYear, currentMonth, 1);
  const startingDay = firstDay.getDay();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < startingDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'turboin-calendar-day turboin-empty-day';
    calendarGrid.appendChild(emptyDay);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'turboin-calendar-day';
    dayCell.textContent = i.toString();

    if (
      i === now.getDate() &&
      currentMonth === now.getMonth() &&
      currentYear === now.getFullYear()
    ) {
      dayCell.classList.add('turboin-current-day');
    }

    calendarGrid.appendChild(dayCell);
  }

  calendarContainer.appendChild(monthYearHeader);
  calendarContainer.appendChild(calendarGrid);

  let displayedMonth = currentMonth;
  let displayedYear = currentYear;

  function updateCalendar() {
    monthYearDisplay.textContent = `${getMonthName(displayedMonth)} ${displayedYear}`;

    while (calendarGrid.children.length > 7) {
      calendarGrid.removeChild(calendarGrid.lastChild!);
    }

    const firstDay = new Date(displayedYear, displayedMonth, 1);
    const startingDay = firstDay.getDay();

    const daysInMonth = new Date(
      displayedYear,
      displayedMonth + 1,
      0
    ).getDate();

    for (let i = 0; i < startingDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'turboin-calendar-day turboin-empty-day';
      calendarGrid.appendChild(emptyDay);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'turboin-calendar-day';
      dayCell.textContent = i.toString();

      if (
        i === now.getDate() &&
        displayedMonth === now.getMonth() &&
        displayedYear === now.getFullYear()
      ) {
        dayCell.classList.add('turboin-current-day');
      }

      calendarGrid.appendChild(dayCell);
    }
  }

  prevMonthBtn.addEventListener('click', () => {
    displayedMonth--;
    if (displayedMonth < 0) {
      displayedMonth = 11;
      displayedYear--;
    }
    updateCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    displayedMonth++;
    if (displayedMonth > 11) {
      displayedMonth = 0;
      displayedYear++;
    }
    updateCalendar();
  });

  return calendarContainer;
}

function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month];
}
