// Data from ADC to file francesca

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <time.h>

int main(int argc, char *argv[])
{
	int fd, file,i,j, Status, data_trig, ord;
	int nbin = 4096;
	int int_trig =  0x41200000;
	int stop_trig = 0x41210000;
	int value = 0;
	unsigned page_addr, page_offset;
	void *ptr,*pt[5],*ptrt,*ptrt1;
	unsigned page_size=sysconf(_SC_PAGESIZE);
	page_offset = 16;
	FILE *fp, *fp1, *fp2;
	int nevt=0;
	time_t rawtime;
	struct tm *timeinfo;
	char buffer[80];
	time ( &rawtime );
	timeinfo = localtime ( &rawtime );
	if (argc>1) ord = argv[1];
	char filename1[100];
	char filename2[100];

	if (argc < 2 || argc > 2){
			usage();
			exit(1);
	}
	  printf("Acquire is running...\n");
	  i=system ("umount /usb 2>/dev/null");
	  i=system ("mountusb 2>/dev/null");
//	  printf ("The value returned was: %d.\n",i);
	  if (i == 0){
		  sprintf(filename1,"/usb/adc_data%s%s.dat", argv[1], asctime(timeinfo));
		  printf("Writing file on USB...\n");
	  }
	  else {
		  sprintf(filename1,"/home/root/adc_data%s%s.dat", argv[1], asctime(timeinfo));
		  printf("Writing file on system...\n");
	  }
	fp1 = fopen (filename1, "w" );
//	fp2 = fopen (filename2, "w" );
	char c;


	/* Open /dev/mem file */
	fd = open ("/dev/mem", O_RDWR);

while(nevt<10)
	{
	fp = fopen ("/srv/www/adc_data.json", "w" );

	//////////////// TRIGGER INTERNO ////////////////////////////////////////
	/* mmap the device into memory */
	page_addr = (int_trig & (~(page_size-1)));
	page_offset = int_trig - page_addr;
	ptrt = mmap(NULL, page_size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, page_addr);

	if (!strcmp(argv[1], "-i")){
							data_trig = 0;
							value = 0b00000011; //genero trigger e acquisisco segnale in BRAM
							*((unsigned *)(ptrt + page_offset)) = value;// Write value to the device register
							usleep(1);
							value = 0b00000010; //*int_trig = 0b00000010;
							*((unsigned *)(ptrt + page_offset)) = value;
	//						printf("Scope with internal trigger is running... ");
	}
	unsigned int bram[5];
	int w, ADC0A[5], ADC0B[5];
	bram[0] = 0x42000000;// ADC 1
	bram[1] = 0x44000000;// ADC 2
	bram[2] = 0x46000000;// ADC 3
	bram[3] = 0x48000000;// ADC 4
	bram[4] = 0x4A000000;// ADC 5

	//////////   TRIGGER ESTERNO //////////////////////////////////
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
				data_trig = (data_trig + 4095 * 4 - 1000) % (4095 * 4);
                page_offset=data_trig;
	       	}

		}
//			printf  ("test1");
			printf ("Event %d OK\n",nevt);

	}//close external trigger

		fprintf(fp1,"\nEvent %d\n",nevt);
	  for(i=0;i<5;i++){
		  //fprintf(fp2,"======adc: =%d=====",i);
		 pt[i] = mmap(NULL, page_size*4, PROT_READ|PROT_WRITE, MAP_SHARED, fd, bram[i]);

  /*       fwrite("!!!!",1,4,fp2);
 //        printf  ("test2");
		 fwrite(&page_offset,sizeof(page_offset),1,fp2);
         fwrite(&i,sizeof(i),1,fp2);
         fwrite((char *)pt[i],1,page_size*4,fp2);	*/
	  }
      nevt++;

	  fprintf(fp,"[");
	  for (i =0; i<nbin; i++) //

	  {
	    fprintf(fp,"{");

	    for (j=0; j<5; j++) {

		    ADC0A[j] = *((unsigned *)(pt[j] + page_offset));

		    ADC0B[j] =ADC0A[j]&0x1fff;

		  //  fprintf(fp1,"\nadc%d %d\n",j*2,j*2+1);
		   // fprintf(fp1,"adc%d\n",i*2+1);
		           fprintf(fp1,"%4d\t",(ADC0A[j]>>16)&0x1fff);
		        //   fprintf(fp1,"adc%d\n %4d\n",i*2+1, ADC0B[i]);
		           fprintf(fp1,"%4d\t", ADC0B[j]);
//		           printf  ("\"adc%d\": \"%d\"",i*2,(ADC0A[i]>>16)&0x1fff);
//		           printf(", \"adc%d\": \"%d\"",i*2+1, ADC0B[i]);
		           fprintf  (fp,"\"adc%d\": \"%d\"",j*2, (ADC0A[j]>>16)&0x1fff);
		           fprintf(fp,", \"adc%d\": \"%d\"",j*2+1, ADC0B[j]);
	          // if (i != 4) {fprintf(fp,", ");}
	          // else {fprintf(fp1,"\n");}
		}
	    page_offset=(page_offset+4)&0x3ffc;
	    fprintf(fp,"}");
	    if (i!=nbin-1)  fprintf(fp,", ");

	  }
	  fprintf(fp,"]");

	    fclose(fp);
//sleep(1);
	    usleep(10000);
		} //close event loop!!
printf("Done!\n\r");
fclose(fp1);
//fclose(fp2);
i=system ("umount /usb 2>/dev/null");
// printf ("The value returned from unmount: %d.\n",i);
	    return 0;
}

void usage(void)
{

	printf("____________________________\n");
	printf("|    -e External trigger   |\n");
	printf("|    -i internal trigger   |\n");
	printf("|__________________________|\n");
	exit(1);
}
