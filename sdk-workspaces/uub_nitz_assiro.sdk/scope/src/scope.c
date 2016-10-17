// UUB simple signal acquisition utility.

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <string.h>

int main(int argc, char **argv)
{
	int fd, file,i,j, Status, data_trig, ord;
	int nev = 4096;
	int int_trig =  0x55000000;
	int stop_trig = 0x56000000;
	int value = 0;
	unsigned page_addr, page_offset;
	void *ptr,*pt[5],*ptrt,*ptrt1;
	unsigned page_size=sysconf(_SC_PAGESIZE);
	page_offset = 16;
	FILE *fp, *fp1, *fp2;
	int nevt = 0;
	char c;

	if (argc < 2 || argc > 2){
		usage();
		exit(1);
	}
	printf("Scope is on...\n");

	//while(nevt<1000)
	while(1)
		{
		fp = fopen ("/srv/www/adc_data.json", "w" );
		/* Open /dev/mem file */
		fd = open ("/dev/mem", O_RDWR);

		//////////////// TRIGGER ////////////////////////////////////////
		/* mmap the device into memory */
		page_addr = (int_trig & (~(page_size-1)));
		page_offset = int_trig - page_addr;
		ptrt = mmap(NULL, page_size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, page_addr);

		//////////////// INTERNAL TRIGGER  ////////////////////////////////////////
		if (!strcmp(argv[1], "-i")){
					value = 0b00000111; //bit 0 trigger interno a FPGA. Aquisisco segnali in BRAM (bit 1 = trigger interno)
					*((unsigned *)(ptrt + page_offset)) = value;// Write value to the device register
					usleep(1);
					value = 0b00000010; //Alzo segnale trigger interno ( acquisizione continua)
					*((unsigned *)(ptrt + page_offset)) = value;

/*					for (i=1 ; i<20 ; i++) ;// delay between acquisition and led shot

					value = 0b00000110; // LED shot (bit 2 high)
					*((unsigned *)(ptrt + page_offset)) = value;
					value = 0b00000010;
					*((unsigned *)(ptrt + page_offset)) = value;
*/
		}

		//////////////// EXTERNAL  TRIGGER ////////////////////////////////////////
		if (!strcmp(argv[1], "-e")){
					data_trig = 0;
					value = 0b10000000; //impostazione per trigger esterno
					*((unsigned *)(ptrt + page_offset)) = value;// Write value to the device register
						usleep(1);
					value = 0b00000000;
					*((unsigned *)(ptrt + page_offset)) = value;
					printf("Waiting trigger... ");
					page_addr = (stop_trig & (~(page_size-1)));	//		data_trig = *stop_trig;
					page_offset = stop_trig - page_addr;
					ptrt1 = mmap(NULL, page_size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, page_addr);
					Status = 0;
					while(Status != 1)		// wait trigger
					{
						data_trig = *((unsigned *)(ptrt1 + page_offset));
						if (data_trig > 0b1000000000000000) {
								Status = 1;
								data_trig = data_trig & 0b0111111111111111;

				                page_offset=(data_trig + 4095 * 4 -100) % (4095 * 4);
					    }
					}
					printf ("Done! ... Event %d\n",nevt);
					//	sleep (1);
		}

		unsigned int bram[5];
		int w, ADC0A[5], ADC0B[5];
		bram[0] = 0x50000000;// ADC 1
		bram[1] = 0x51000000;// ADC 2
		bram[2] = 0x52000000;// ADC 3
		bram[3] = 0x53000000;// ADC 4
		bram[4] = 0x54000000;// ADC 5

		for(i=0;i<5;i++)
		  	  pt[i] = mmap(NULL, page_size*4, PROT_READ|PROT_WRITE, MAP_SHARED, fd, bram[i]);
      	  	  nevt++;
      	  	  fprintf(fp,"[");
      	  	  for(j=0; j<nev; j++)  //
      	  	  {
      	  		  fprintf(fp,"{");
      	  		  for (i =0; i<5; i++){
      	  			  ADC0A[i] = *((unsigned *)(pt[i] + page_offset));
      	  			  ADC0B[i] =ADC0A[i]&0x1fff;
      	  			  fprintf  (fp,"\"adc%d\": \"%d\"",i*2, (ADC0A[i]>>16)&0x1fff);
      	  			  fprintf(fp,", \"adc%d\": \"%d\"",i*2+1, ADC0B[i]);
      	  			  if (i != 4) {fprintf(fp,", ");}
      	  		  }
      	  		  page_offset=(page_offset+4)&0x3ffc;
      	  		  fprintf(fp,"}");
      	  		  if (j!=nev-1)  fprintf(fp,", ");
      	  	  }
      	 fprintf(fp,"]");
      	 fclose(fp);
      	 usleep(200000);
		 }
		 printf("Files written!\n\r");
		 return 0;
	}

void usage(void)
{
	printf("____________________________\n");
	printf("|          SCOPE           |\n");
	printf("|    -e External trigger   |\n");
	printf("|    -i internal trigger   |\n");
	printf("|                          |\n");
	printf("|    written by R.Assiro   |\n");
	printf("|__________________________|\n");
	exit(1);
}
