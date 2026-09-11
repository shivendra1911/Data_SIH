declare module 'mp4box' {
  export interface MP4MediaTrack {
    id: number;
    created: Date;
    modified: Date;
    movie_duration: number;
    movie_timescale: number;
    layer: number;
    alternate_group: number;
    volume: number;
    track_width: number;
    track_height: number;
    timescale: number;
    duration: number;
    bitrate: number;
    codec: string;
    video?: {
      width: number;
      height: number;
    };
    audio?: {
      sample_rate: number;
      channel_count: number;
      sample_size: number;
    };
    nb_samples: number;
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    isFragmented: boolean;
    isProgressive: boolean;
    hasMoov: boolean;
    tracks: MP4MediaTrack[];
    videoTracks: MP4MediaTrack[];
    audioTracks: MP4MediaTrack[];
  }

  export interface MP4Sample {
    alreadyRead: number;
    chunk_index: number;
    chunk_run_index: number;
    cts: number;
    data: Uint8Array;
    degradation_priority: number;
    dts: number;
    duration: number;
    has_redundancy: boolean;
    is_depended_on: boolean;
    is_leading: number;
    is_sync: boolean;
    number: number;
    offset: number;
    size: number;
    timescale: number;
    track_id: number;
  }

  export interface MP4BoxBuffer extends ArrayBuffer {
    fileStart: number;
  }

  export interface TrakEntry {
    avcC?: any;
    hvcC?: any;
    vpcC?: any;
    av1C?: any;
    [key: string]: any;
  }

  export interface MP4Trak {
    mdia: {
      minf: {
        stbl: {
          stsd: {
            entries: TrakEntry[];
          };
        };
      };
    };
    [key: string]: any;
  }

  export class DataStream {
    static BIG_ENDIAN: boolean;
    buffer: ArrayBuffer;
    constructor(buffer?: ArrayBuffer, byteOffset?: number, endianness?: boolean);
    [key: string]: any;
  }

  export interface MP4File {
    onReady?: (info: MP4Info) => void;
    onError?: (e: any) => void;
    onSamples?: (id: number, user: any, samples: MP4Sample[]) => void;
    appendBuffer(data: MP4BoxBuffer): number;
    setExtractionOptions(id: number, user?: any, options?: { nbSamples?: number; rapAlignment?: boolean }): void;
    start(): void;
    stop(): void;
    flush(): void;
    getTrackById(id: number): MP4Trak;
    [key: string]: any;
  }

  export function createFile(): MP4File;
}
