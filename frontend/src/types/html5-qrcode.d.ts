declare module "html5-qrcode" {
  export interface Html5QrcodeCamera {
    id: string;
    label: string;
  }

  export class Html5Qrcode {
    constructor(elementId: string);

    static getCameras(): Promise<Html5QrcodeCamera[]>;
    isScanning: boolean;

    start(
      cameraIdOrConfig: string | { facingMode: "user" | "environment" },
      config: {
        fps?: number;
        qrbox?: number | { width: number; height: number };
      },
      onSuccess: (decodedText: string, decodedResult: any) => void,
      onError?: (errorMessage: string) => void,
    ): Promise<void>;

    stop(): Promise<void>;
    clear(): Promise<void>;
  }
}
