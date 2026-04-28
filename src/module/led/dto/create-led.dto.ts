export class ControlLedDto {
  state!: boolean;
}

export class ChangeModeDto {
  mode!: 'manual' | 'auto';
}

export class StatusResponseDto {
  led_state!: boolean;
  manual_mode!: boolean;
  toggle_count!: number;
}

export class SensorStatusResponseDto {
  motion_active!: boolean;
}

export class FullStatusResponseDto {
  led!: {
    state: boolean;
    status_text: string;
  };
  mode!: {
    manual_mode: boolean;
    mode_text: string;
  };
  sensor!: {
    motion_active: boolean;
    status_text: string;
  };
  statistics!: {
    toggle_count: number;
  };
  timestamp!: string;
}
