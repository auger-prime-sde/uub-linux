// Data Acquisition from ADC data to file
// implemented USB write file if memory key is connected

 int dac_led1, dac_led2, dac_led3, dac_led4;
 int HV_value;
void *pt[5]; //memory access to the FADC

#include "ssd_test_code.h"
void usage(void);
int main(int argc, char *argv[])
{
	int fd, i, Status, data_trig;
	int int_trig =  0x55000000;
	int stop_trig = 0x56000000;
	int value = 0;
	unsigned page_addr, page_offset,page_offset_save;
	void *ptrt,*ptrt1;
	unsigned page_size=sysconf(_SC_PAGESIZE);
	page_offset = 16;
	FILE *fp1;
	int nevt=0;
	char filename1[100];
    char opt[2];
    char trigger[2];
    int LoopLED=0;
    int nWord,NPMT,CH1[5],CH2[5];
	unsigned int bram[5];
	bram[0] = 0x50000000;// ADC 1
	bram[1] = 0x51000000;// ADC 2
	bram[2] = 0x52000000;// ADC 3
	bram[3] = 0x53000000;// ADC 4
	bram[4] = 0x54000000;// ADC 5
	CH1[0]=1;
	CH1[1]=3;
	CH1[2]=5;
	CH1[3]=7;
	CH1[4]=9;

	CH2[0]=2;
	CH2[1]=4;
	CH2[2]=6;
	CH2[3]=8;
	CH2[4]=10;
	if (argc < 4 || argc > 5){
			usage();
			exit(1);
	}
	sprintf(opt,"%s", argv[1]);
	printf("SSD test code is running...\n");
// set Led
//	set_led(180,180,100,100);
//set HV PMT
//	HV_value=800;
//	set_PMT_hv(4,HV_value);
// trigger
//	set_trigger(300,300,300,1);
	i=system ("umount /usb 2>/dev/null");
	i=system ("mountusb 2>/dev/null"); //mountusb is a bash script
//	printf ("The value returned was: %d.\n",i);
	if (i == 0){
		  sprintf(filename1,"/usb/%s", argv[2]);
		  printf("Writing file on USB...\n");
	}
	else {
		  sprintf(filename1,"/home/root/%s", argv[2]);
		  printf("Writing file on system...\n");
	}
	fp1 = fopen (filename1, "w" );
	int NtotEvt;
	printf("%d\n",argc);
	if (argc == 4) {
		 NtotEvt=100;
		 printf("Default N. Event  %d \n",NtotEvt);
	}
	else {
		NtotEvt  = atoi (argv[4]);
		printf("Acquire  %d  events\n",NtotEvt);
	}
// PMT
	NPMT  = atoi (argv[3]);
	if (!strcmp(opt, "-l")) {
		LoopLED=1;
		sprintf(trigger,"-i");
	}
	if (!strcmp(opt, "-i")) {
		LoopLED=0;
		sprintf(trigger,"-i");
	}
	if (!strcmp(opt, "-e")) {
		LoopLED=0;
		sprintf(trigger,"-e");
	}
	/* Open /dev/mem file */
	fd = open ("/dev/mem", O_RDWR);
// shared memory for internal trigger
	page_addr = (int_trig & (~(page_size-1)));
	ptrt = mmap(NULL, page_size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, page_addr);
	// shared memory for external trigger
	page_addr = (stop_trig & (~(page_size-1)));	//		data_trig = *stop_trig;
	ptrt1 = mmap(NULL, page_size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, page_addr);
// shared memory for FADC
	for (i=0;i<5;i++)
	    pt[i] = mmap(NULL, page_size*4, PROT_READ|PROT_WRITE, MAP_SHARED, fd, bram[i]);
	while(nevt<NtotEvt)
	{
	    if (LoopLED){
		  if(!led_loop(100))   // Linearity test of the PMT with LEDs
	      {
//			printf("LED loop OK!\n");

	      } else break;
	    }

		//////////////// TRIGGER ////////////////////////////////////////
		/* mmap the device into memory */
		page_addr = (int_trig & (~(page_size-1)));
		page_offset = int_trig - page_addr;

		//////////////// INTERNAL TRIGGER  ////////////////////////////////////////
		if (!strcmp(trigger, "-i")){
					value = 0b00000111; //bit 0 trigger interno a FPGA. Aquisisco segnali in BRAM (bit 1 = trigger interno)
					*((unsigned *)(ptrt + page_offset)) = value;// Write value to the device register
					value = 0b00000010; //Alzo segnale trigger interno ( acquisizione continua)
					*((unsigned *)(ptrt + page_offset)) = value;
		}
		//////////  EXTERNAL TRIGGER  //////////////////////////////////
		if (!strcmp(opt, "-e")){
			data_trig = 0;
			value = 0b10000000; //impostazione per trigger esterno
			*((unsigned *)(ptrt + page_offset)) = value;// Write value to the device register
			usleep(1);
			value = 0b00000000;
			*((unsigned *)(ptrt + page_offset)) = value;

//			printf("Waiting trigger... ");
			page_addr = (stop_trig & (~(page_size-1)));	//		data_trig = *stop_trig;
			page_offset = stop_trig - page_addr;
			Status = 0;
			while(Status != 1)		// wait trigger
			{
				data_trig = *((unsigned *)(ptrt1 + page_offset));
				if (data_trig > 0b1000000000000000) {
					Status = 1;
					data_trig = data_trig & 0b0111111111111111;
					data_trig = (data_trig + 4095 * 4 - 1000) % (4095 * 4);
					page_offset=data_trig;
				}
			}
		  }
// write event header in file
		  fprintf(fp1,"\nEvent %d\n",nevt);
		  fprintf(fp1,"\n%d %d %d %d %d\n",HV_value, dac_led1, dac_led2, dac_led3, dac_led4);
// Acq 1 event
		  page_offset_save=page_offset; // to "scope" the event
// Acquire a full event (10 channels, 4096 words)
 //         acquire_evt(fp1,fd,&page_offset);
//	Acquire the first nWord (1-4096) words of the Channel CH (1-10)
		  nWord=300;
		  fprintf(fp1,"Channel %d \n",CH1[NPMT-1]);
		  page_offset=page_offset_save;
          acquire_ch(fp1,&page_offset,CH1[NPMT-1],nWord);
		  nWord=300;
		  fprintf(fp1,"Channel %d \n",CH2[NPMT-1]);
		  page_offset=page_offset_save;
          acquire_ch(fp1,&page_offset,CH2[NPMT-1],nWord);
// Write json file for "scope"
		  page_offset=page_offset_save;
          if (nevt%10==0) scope_evt(&page_offset);  // only 10% of the events NOT WORK Why?
          if (nevt%100==0) printf ("Done! ... Event %d\n",nevt);
		  nevt++;
		} //close event loop!!
		printf("Done!\n\r");
		fclose(fp1);
		i=system ("umount /usb 2>/dev/null");
		return 0;


}
void usage(void)
{
	printf("______________________________________\n");
	printf("|                                     |\n");
	printf("| code opt filename NPMT [nevt]       |\n");
	printf("|  opt                                |\n");
	printf("|    -e External trigger              |\n");
	printf("|    -i internal trigger              |\n");
	printf("|    -l loop LED                      |\n");
	printf("|  NPMT  (n. of PMT  1-5)             |\n");
	printf("|  nevt  (n. of events)               |\n");
	printf("|    default 100                      |\n");
	printf("|    by M.R. Coluccia                 |\n");
	printf("|       D. Martello                   |\n");
	printf("|                                     |\n");
	printf("|_____________________________________|\n");
	exit(1);
}
