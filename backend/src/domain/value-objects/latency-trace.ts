export type SpineStage =
  | 'transcript_received'
  | 'llm_request_sent'
  | 'llm_first_token'
  | 'first_sentence_ready'
  | 'first_tts_audio'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'llm_done'
  | 'turn_complete';

export type LatencyTrace = ReadonlyMap<SpineStage, number>;

export type MutableLatencyTrace = Map<SpineStage, number>;
